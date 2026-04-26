package main

import (
    "fmt"
    "log"
    "os"
    "sync/atomic"
    "text/tabwriter"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    natsURL := nats.DefaultURL
    subject := "telemetry.backpressure"
    streamName := "DEGRADATION_TEST"

    totalEvents := 10000
    simulatedMLDelay := 50 * time.Millisecond // configurable

    // You can override via env if desired
    if v := os.Getenv("TOTAL_EVENTS"); v != "" {
        fmt.Sscanf(v, "%d", &totalEvents)
    }
    if v := os.Getenv("ML_DELAY_MS"); v != "" {
        var ms int
        fmt.Sscanf(v, "%d", &ms)
        simulatedMLDelay = time.Duration(ms) * time.Millisecond
    }

    fmt.Println("🚀 LAYER 4: Backpressure Test")
    fmt.Printf("⚠️  Simulated ML delay: %v per message\n", simulatedMLDelay)

    nc, err := nats.Connect(natsURL, nats.Name("backpressure-bench"))
    if err != nil {
        log.Fatalf("nats connect: %v", err)
    }
    // Drain on exit to allow pending acks to flush
    defer nc.Drain()

    js, err := nc.JetStream()
    if err != nil {
        log.Fatalf("jetstream: %v", err)
    }

    // Create stream if missing
    if si, _ := js.StreamInfo(streamName); si == nil {
        _, err := js.AddStream(&nats.StreamConfig{
            Name:     streamName,
            Subjects: []string{subject},
            Storage:  nats.FileStorage,
        })
        if err != nil {
            log.Fatalf("add stream: %v", err)
        }
    }

    var acked uint64
    var maxPending uint64
    var lastPending uint64
    var drainTime time.Duration
    start := time.Now()

    // Durable manual-ack consumer (slow worker)
    _, err = js.Subscribe(subject, func(m *nats.Msg) {
        // Simulate slow ML inference
        time.Sleep(simulatedMLDelay)

        if err := m.Ack(); err != nil {
            // don't fatal here; record and continue
            log.Printf("ack error: %v", err)
            return
        }
        n := atomic.AddUint64(&acked, 1)
        // record drain time when we reach all messages
        if int(n) == totalEvents {
            drainTime = time.Since(start)
        }
    }, nats.Durable("SLOW_ML_WORKER"), nats.ManualAck())
    if err != nil {
        log.Fatalf("subscribe error: %v", err)
    }

    // Ensure subscription is registered
    if err := nc.Flush(); err != nil {
        log.Fatalf("nats flush: %v", err)
    }

    // Ingest spike
    fmt.Printf("📡 Publishing %d events...\n", totalEvents)
    pubStart := time.Now()
    for i := 0; i < totalEvents; i++ {
        _, err := js.Publish(subject, []byte(`{"device":"watch_02","v":99.5}`))
        if err != nil {
            log.Fatalf("publish error at %d: %v", i, err)
        }
    }
    pubElapsed := time.Since(pubStart)
    fmt.Printf("✅ Published %d messages in %v (%.1f msg/sec)\n", totalEvents, pubElapsed, float64(totalEvents)/pubElapsed.Seconds())

    // Monitor pending/acked until drained or timeout (10 minutes)
    timeout := 10 * time.Minute
    deadline := time.Now().Add(timeout)
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        <-ticker.C
        si, _ := js.StreamInfo(streamName)
        ci, _ := js.ConsumerInfo(streamName, "SLOW_ML_WORKER")

        var pending uint64
        if ci != nil {
            pending = uint64(ci.NumPending)
        } else if si != nil {
            // if no consumer info, fallback to stream total msgs
            if si.State.Msgs > 0 {
                pending = uint64(si.State.Msgs)
            }
        }

        lastPending = pending
        if pending > maxPending {
            maxPending = pending
        }

        currAcked := atomic.LoadUint64(&acked)
        fmt.Printf("[monitor] acked=%d pending=%d elapsed=%v\n", currAcked, pending, time.Since(start))

        if int(currAcked) >= totalEvents {
            fmt.Println("✅ All messages acknowledged by consumer.")
            break
        }
        if time.Now().After(deadline) {
            fmt.Printf("⏱ Timeout reached after %v (acked=%d / %d). Last pending=%d\n", timeout, currAcked, totalEvents, pending)
            break
        }
    }

    // Final metrics
    totalPublished := totalEvents
    totalAcked := int(atomic.LoadUint64(&acked))
    successRate := 100.0 * float64(totalAcked) / float64(totalPublished)
    totalElapsed := time.Since(start)
    if drainTime == 0 && totalAcked > 0 {
        // best-effort estimate: when last ack occurred equals now
        drainTime = totalElapsed
    }

    // Print a neat table
    w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
    fmt.Fprintln(w, "Metric\tValue")
    fmt.Fprintln(w, "------\t-----")
    fmt.Fprintf(w, "Total published\t%d\n", totalPublished)
    fmt.Fprintf(w, "Total acked\t%d\n", totalAcked)
    fmt.Fprintf(w, "Success rate\t%.2f%%\n", successRate)
    fmt.Fprintf(w, "Publish elapsed\t%v\n", pubElapsed)
    fmt.Fprintf(w, "Publish throughput (msg/sec)\t%.1f\n", float64(totalPublished)/pubElapsed.Seconds())
    fmt.Fprintf(w, "Total test elapsed\t%v\n", totalElapsed)
    fmt.Fprintf(w, "Time to drain (when last ack observed)\t%v\n", drainTime)
    fmt.Fprintf(w, "Max pending observed\t%d\n", maxPending)
    fmt.Fprintf(w, "Pending at finish\t%d\n", lastPending)
    fmt.Fprintf(w, "Simulated ML delay per msg\t%v\n", simulatedMLDelay)
    fmt.Fprintf(w, "Monitor timeout\t%v\n", timeout)
    w.Flush()
}
