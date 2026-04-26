package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "sort"
    "sync"
    "sync/atomic"
    "time"

    "github.com/nats-io/nats.go"
    "github.com/redis/go-redis/v9"
)

type Telemetry struct {
    DeviceID  string    `json:"device_id"`
    Timestamp time.Time `json:"timestamp"`
    Value     float64   `json:"value"`
}

var ctx = context.Background()

func percentile(sorted []float64, p float64) float64 {
    if len(sorted) == 0 { return 0 }
    r := p * float64(len(sorted)-1)
    l := int(r)
    if l == len(sorted)-1 { return sorted[l] }
    f := r - float64(l)
    return sorted[l]*(1-f) + sorted[l+1]*f
}

func main() {
    natsURL := nats.DefaultURL
    redisAddr := "localhost:6379"
    totalEvents := 5000
    mlDelay := 170 * time.Microsecond // configurable for backpressure

    if v := os.Getenv("TOTAL_EVENTS"); v != "" { fmt.Sscanf(v, "%d", &totalEvents) }
    if v := os.Getenv("ML_DELAY_MS"); v != "" { var ms int; fmt.Sscanf(v, "%d", &ms); mlDelay = time.Duration(ms) * time.Millisecond }

    nc, err := nats.Connect(natsURL, nats.Name("e2e-bench"))
    if err != nil { log.Fatalf("NATS Error: %v", err) }
    defer nc.Close()

    rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
    if err := rdb.Ping(ctx).Err(); err != nil { log.Fatalf("Redis Error: %v", err) }
    defer rdb.Close()

    fmt.Printf("🚀 Starting E2E benchmark: events=%d ml_delay=%v\n", totalEvents, mlDelay)

    var received uint64
    latencies := make([]float64, 0, totalEvents)
    var latMu sync.Mutex

    // Use a WaitGroup + done channel with timeout to avoid hanging forever
    var wg sync.WaitGroup
    wg.Add(1)
    done := make(chan struct{})

    // Ensure subscription is ready before publishing
    sub, err := nc.Subscribe("telemetry.hotpath", func(m *nats.Msg) {
        var t Telemetry
        _ = json.Unmarshal(m.Data, &t)

        // Redis sliding window in a pipeline (reduce round trips)
        redisKey := fmt.Sprintf("device:%s:window", t.DeviceID)
        _, err := rdb.Pipelined(ctx, func(pipe redis.Pipeliner) error {
            pipe.LPush(ctx, redisKey, t.Value)
            pipe.LTrim(ctx, redisKey, 0, 599)
            pipe.Expire(ctx, redisKey, 2*time.Hour)
            return nil
        })
        if err != nil {
            // log but continue the benchmark
            log.Printf("redis pipeline error: %v", err)
        }

        // simulated ML work (tunable)
        time.Sleep(mlDelay)

        lat := time.Since(t.Timestamp).Seconds() * 1000.0 // ms
        latMu.Lock()
        latencies = append(latencies, lat)
        latMu.Unlock()

        atomic.AddUint64(&received, 1)
    })
    if err != nil {
        log.Fatalf("subscribe error: %v", err)
    }
    // ensure server has registered the subscription
    if err := nc.Flush(); err != nil { log.Fatalf("nats flush: %v", err) }

    // Start a goroutine to wait for expected count or timeout
    go func() {
        ticker := time.NewTicker(100 * time.Millisecond)
        defer ticker.Stop()
        start := time.Now()
        for {
            if int(atomic.LoadUint64(&received)) >= totalEvents {
                break
            }
            if time.Since(start) > 30*time.Second+time.Duration(totalEvents/100)*time.Millisecond {
                // timeout heuristic (adjust per scale)
                break
            }
            <-ticker.C
        }
        close(done)
        wg.Done()
    }()

    // Publish loop
    start := time.Now()
    for i := 0; i < totalEvents; i++ {
        t := Telemetry{DeviceID: "watch_01", Timestamp: time.Now(), Value: 100.0}
        data, _ := json.Marshal(t)
        if err := nc.Publish("telemetry.hotpath", data); err != nil {
            log.Printf("publish err: %v", err)
        }
    }
    // ensure messages are sent to server
    if err := nc.Flush(); err != nil { log.Printf("nats flush err: %v", err) }

    // wait for done (or timeout)
    select {
    case <-done:
    case <-time.After(60 * time.Second):
        log.Printf("timeout waiting for consumers (received=%d)", atomic.LoadUint64(&received))
    }

    // cleanup
    if err := sub.Unsubscribe(); err != nil { log.Printf("unsubscribe: %v", err) }

    totalReceived := int(atomic.LoadUint64(&received))
    elapsed := time.Since(start)

    // compute percentile stats
    latMu.Lock()
    sort.Float64s(latencies)
    p50 := percentile(latencies, 0.50)
    p95 := percentile(latencies, 0.95)
    p99 := percentile(latencies, 0.99)
    var sum float64
    for _, v := range latencies { sum += v }
    avg := 0.0
    if len(latencies) > 0 { avg = sum / float64(len(latencies)) }
    latMu.Unlock()

    fmt.Printf("\n✅ E2E Summary\n")
    fmt.Printf("- events published: %d\n", totalEvents)
    fmt.Printf("- events received:  %d\n", totalReceived)
    fmt.Printf("- success rate:     %.2f%%\n", 100.0*float64(totalReceived)/float64(totalEvents))
    fmt.Printf("- elapsed:          %v\n", elapsed)
    fmt.Printf("- publish throughput: %.1f msg/sec\n", float64(totalEvents)/elapsed.Seconds())
    fmt.Printf("- avg e2e ms:       %.3f\n", avg)
    fmt.Printf("- p50/p95/p99 ms:   %.3f / %.3f / %.3f\n", p50, p95, p99)
}
