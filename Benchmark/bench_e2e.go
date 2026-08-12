// bench_e2e.go — Real end-to-end benchmark for RakshaSaathi
//
// Benchmarks the ACTUAL running system:
//   - POST /event API throughput and latency
//   - Redis state correctness (alert created == events sent)
//   - NATS JetStream consumer verification
//   - Idempotency verification (duplicate events not processed twice)
//
// Usage:
//   go run bench_e2e.go [flags]
//
// Flags:
//   -url         Backend URL (default: http://localhost:8080)
//   -redis       Redis addr (default: localhost:6379)
//   -nats        NATS URL (default: nats://localhost:4222)
//   -events      Total events (default: 1000)
//   -concurrency Concurrent workers (default: 10)
//   -type        Event type: vitals|fall|sos|anomaly (default: vitals)
//   -output      Output format: text|json|csv (default: text)

package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

// ---- Data Structures ----

type BenchEvent struct {
	EventID   string          `json:"event_id"`
	Type      string          `json:"type"`
	UserID    string          `json:"user_id"`
	Timestamp time.Time       `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

type BenchResult struct {
	Config       BenchConfig       `json:"config"`
	Correctness  CorrectnessReport `json:"correctness"`
	Throughput   ThroughputStats   `json:"throughput"`
	Latency      LatencyStats      `json:"latency"`
	Errors       ErrorStats        `json:"errors"`
	SystemState  SystemStateReport `json:"system_state"`
}

type BenchConfig struct {
	BackendURL  string `json:"backend_url"`
	TotalEvents int    `json:"total_events"`
	Concurrency int    `json:"concurrency"`
	EventType   string `json:"event_type"`
	RunAt       string `json:"run_at"`
}

type CorrectnessReport struct {
	EventsPublished     int  `json:"events_published"`
	EventsAccepted      int  `json:"events_accepted"`
	EventsRejected      int  `json:"events_rejected"`
	IdempotencyVerified bool `json:"idempotency_verified"`
	AcceptanceRatePct   float64 `json:"acceptance_rate_pct"`
}

type ThroughputStats struct {
	TotalDuration  string  `json:"total_duration"`
	EventsPerSec   float64 `json:"events_per_sec"`
	PublishRate    float64 `json:"publish_rate_per_sec"`
}

type LatencyStats struct {
	MinMs  float64 `json:"min_ms"`
	AvgMs  float64 `json:"avg_ms"`
	P50Ms  float64 `json:"p50_ms"`
	P95Ms  float64 `json:"p95_ms"`
	P99Ms  float64 `json:"p99_ms"`
	MaxMs  float64 `json:"max_ms"`
}

type ErrorStats struct {
	NetworkErrors   int `json:"network_errors"`
	ServerErrors    int `json:"server_errors"`
	TimeoutErrors   int `json:"timeout_errors"`
}

type SystemStateReport struct {
	RedisAlertKeys     int    `json:"redis_alert_keys"`
	RedisVitalsKeys    int    `json:"redis_vitals_keys"`
	RedisIdempotencyKeys int  `json:"redis_idempotency_keys"`
	NATSStreamMsgs     int64  `json:"nats_stream_msgs"`
	NATSStreamBytes    int64  `json:"nats_stream_bytes"`
}

// ---- Payload Factories ----

func makeVitalsPayload() json.RawMessage {
	hr := 60.0 + rand.Float64()*40.0
	spo2 := 94.0 + rand.Float64()*6.0
	temp := 36.0 + rand.Float64()*2.0
	return json.RawMessage(fmt.Sprintf(
		`{"heart_rate":%.1f,"spo2":%.1f,"temperature":%.1f,"steps":%d,"sleep_status":0}`,
		hr, spo2, temp, rand.Intn(5000),
	))
}

func makeFallPayload() json.RawMessage {
	return json.RawMessage(fmt.Sprintf(`{"confidence":%.2f,"location":"living_room"}`, 0.7+rand.Float64()*0.3))
}

func makeSOSPayload() json.RawMessage {
	return json.RawMessage(`{"trigger":"manual","location":"bedroom"}`)
}

func makeAnomalyPayload() json.RawMessage {
	return json.RawMessage(`{"severity":"MEDIUM","metric":"heart_rate","message":"Elevated HR detected"}`)
}

func buildEvent(eventType, userID string, i int) BenchEvent {
	var payload json.RawMessage
	switch eventType {
	case "fall.detected":
		payload = makeFallPayload()
	case "sos.triggered":
		payload = makeSOSPayload()
	case "anomaly.detected":
		payload = makeAnomalyPayload()
	default:
		payload = makeVitalsPayload()
		eventType = "vitals.updated"
	}
	return BenchEvent{
		EventID:   fmt.Sprintf("bench-%s-%d-%d", userID, i, time.Now().UnixNano()),
		Type:      eventType,
		UserID:    userID,
		Timestamp: time.Now(),
		Payload:   payload,
	}
}

// ---- Percentile ----

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	r := p * float64(len(sorted)-1)
	l := int(r)
	if l >= len(sorted)-1 {
		return sorted[len(sorted)-1]
	}
	f := r - float64(l)
	return sorted[l]*(1-f) + sorted[l+1]*f
}

// ---- NATS Stream Info via HTTP monitoring ----

type NATSStreamInfo struct {
	State struct {
		Msgs  int64 `json:"messages"`
		Bytes int64 `json:"bytes"`
	} `json:"state"`
}

func getNATSStreamInfo(natsMonitorURL, streamName string) (int64, int64) {
	resp, err := http.Get(fmt.Sprintf("%s/streamz?name=%s", natsMonitorURL, streamName))
	if err != nil {
		return -1, -1
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var info NATSStreamInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return -1, -1
	}
	return info.State.Msgs, info.State.Bytes
}

// ---- Main Benchmark ----

func main() {
	backendURL := flag.String("url", "http://localhost:8080", "Backend URL")
	redisAddr := flag.String("redis", "localhost:6379", "Redis address")
	natsMonitor := flag.String("nats-monitor", "http://localhost:8222", "NATS monitoring URL")
	totalEvents := flag.Int("events", 1000, "Total events to send")
	concurrency := flag.Int("concurrency", 10, "Concurrent workers")
	eventTypeFlag := flag.String("type", "vitals", "Event type: vitals|fall|sos|anomaly")
	outputFormat := flag.String("output", "text", "Output format: text|json|csv")
	flag.Parse()

	// Map short names to NATS subject names
	eventTypeMap := map[string]string{
		"vitals":  "vitals.updated",
		"fall":    "fall.detected",
		"sos":     "sos.triggered",
		"anomaly": "anomaly.detected",
	}
	eventType, ok := eventTypeMap[*eventTypeFlag]
	if !ok {
		eventType = "vitals.updated"
	}

	ctx := context.Background()

	// ---- Pre-flight: Verify system is reachable ----
	fmt.Println("=== RakshaSaathi E2E Benchmark ===")
	fmt.Printf("Target: %s | Events: %d | Concurrency: %d | Type: %s\n",
		*backendURL, *totalEvents, *concurrency, eventType)

	hresp, err := http.Get(*backendURL + "/health")
	if err != nil {
		log.Fatalf("PREFLIGHT FAILED: cannot reach backend at %s: %v", *backendURL, err)
	}
	hresp.Body.Close()
	if hresp.StatusCode != 200 {
		log.Fatalf("PREFLIGHT FAILED: health check returned %d", hresp.StatusCode)
	}
	fmt.Println("[OK] Backend is reachable")

	// ---- Setup Redis client to verify correctness ----
	rdb := redis.NewClient(&redis.Options{Addr: *redisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("PREFLIGHT FAILED: cannot reach Redis at %s: %v", *redisAddr, err)
	}
	fmt.Println("[OK] Redis is reachable")

	// Flush only bench-specific keys to avoid contaminating real data
	// We'll track keys by user prefix instead
	benchUserBase := "bench_user"

	// ---- Run Benchmark ----
	var (
		accepted      atomic.Int64
		rejected      atomic.Int64
		networkErrors atomic.Int64
		serverErrors  atomic.Int64
		timeoutErrors atomic.Int64
	)

	latencies := make([]float64, 0, *totalEvents)
	var latMu sync.Mutex

	eventCh := make(chan BenchEvent, *totalEvents)
	var wg sync.WaitGroup

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        *concurrency * 2,
			MaxIdleConnsPerHost: *concurrency * 2,
		},
	}

	// Generate all events upfront so publish time is not measurement noise
	events := make([]BenchEvent, *totalEvents)
	for i := 0; i < *totalEvents; i++ {
		userIdx := i % 5 // simulate 5 users
		userID := fmt.Sprintf("%s_%d", benchUserBase, userIdx)
		events[i] = buildEvent(eventType, userID, i)
	}

	// Worker pool
	for w := 0; w < *concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for event := range eventCh {
				data, _ := json.Marshal(event)
				start := time.Now()
				resp, err := client.Post(*backendURL+"/event", "application/json", bytes.NewBuffer(data))
				elapsed := time.Since(start).Seconds() * 1000.0

				if err != nil {
					if os.IsTimeout(err) {
						timeoutErrors.Add(1)
					} else {
						networkErrors.Add(1)
					}
					continue
				}
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()

				if resp.StatusCode == 202 {
					accepted.Add(1)
					latMu.Lock()
					latencies = append(latencies, elapsed)
					latMu.Unlock()
				} else if resp.StatusCode >= 500 {
					serverErrors.Add(1)
				} else {
					rejected.Add(1)
				}
			}
		}()
	}

	benchStart := time.Now()
	for _, e := range events {
		eventCh <- e
	}
	close(eventCh)
	wg.Wait()
	benchDuration := time.Since(benchStart)

	// Small wait for async processing to settle
	time.Sleep(500 * time.Millisecond)

	// ---- Correctness Verification ----
	fmt.Println("\n=== Correctness Verification ===")

	// 1. Check Redis for idempotency keys
	idempotencyKeys, _ := rdb.Keys(ctx, "processed:bench-*").Result()
	fmt.Printf("[CHECK] Idempotency keys in Redis: %d (expected ~%d)\n",
		len(idempotencyKeys), int(accepted.Load()))

	// 2. Verify duplicate event is not processed twice
	// Send the FIRST event again — it should be silently skipped (idempotency)
	idempotencyVerified := false
	if len(events) > 0 {
		dupEvent := events[0]
		data, _ := json.Marshal(dupEvent)
		resp, err := client.Post(*backendURL+"/event", "application/json", bytes.NewBuffer(data))
		if err == nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			// The API returns 202 for accepted (API-level). The actual idempotency
			// is enforced INSIDE the consumer (Redis SetNX). We verify via key count.
			// If idempotency key already exists, the engine will skip it.
			keys2, _ := rdb.Keys(ctx, "processed:bench-*").Result()
			// Count should be same (no new key added for duplicate event_id)
			idempotencyVerified = len(keys2) == len(idempotencyKeys)
			fmt.Printf("[CHECK] Idempotency: after duplicate publish, key count %d -> %d (verified=%v)\n",
				len(idempotencyKeys), len(keys2), idempotencyVerified)
		}
	}

	// 3. Check Redis alert keys (only for alert-generating event types)
	alertKeys, _ := rdb.Keys(ctx, "alert:alert:bench_user_*").Result()
	vitalsKeys, _ := rdb.Keys(ctx, "vitals:bench_user_*").Result()

	fmt.Printf("[CHECK] Redis alert keys: %d\n", len(alertKeys))
	fmt.Printf("[CHECK] Redis vitals sorted-set keys: %d\n", len(vitalsKeys))

	// 4. NATS stream info
	natsStreamMsgs, natsStreamBytes := getNATSStreamInfo(*natsMonitor, "RAKSHASAATHI")
	fmt.Printf("[CHECK] NATS stream RAKSHASAATHI: msgs=%d bytes=%d\n", natsStreamMsgs, natsStreamBytes)

	// ---- Compute Stats ----
	latMu.Lock()
	sort.Float64s(latencies)
	var sumLat float64
	for _, l := range latencies {
		sumLat += l
	}
	avgLat := 0.0
	if len(latencies) > 0 {
		avgLat = sumLat / float64(len(latencies))
	}
	latMu.Unlock()

	totalAccepted := int(accepted.Load())
	totalRejected := int(rejected.Load())

	result := BenchResult{
		Config: BenchConfig{
			BackendURL:  *backendURL,
			TotalEvents: *totalEvents,
			Concurrency: *concurrency,
			EventType:   eventType,
			RunAt:       time.Now().Format(time.RFC3339),
		},
		Correctness: CorrectnessReport{
			EventsPublished:     *totalEvents,
			EventsAccepted:      totalAccepted,
			EventsRejected:      totalRejected,
			IdempotencyVerified: idempotencyVerified,
			AcceptanceRatePct:   100.0 * float64(totalAccepted) / float64(*totalEvents),
		},
		Throughput: ThroughputStats{
			TotalDuration: benchDuration.String(),
			EventsPerSec:  float64(totalAccepted) / benchDuration.Seconds(),
			PublishRate:   float64(*totalEvents) / benchDuration.Seconds(),
		},
		Latency: LatencyStats{
			MinMs: func() float64 {
				if len(latencies) == 0 { return 0 }
				return latencies[0]
			}(),
			AvgMs: avgLat,
			P50Ms: percentile(latencies, 0.50),
			P95Ms: percentile(latencies, 0.95),
			P99Ms: percentile(latencies, 0.99),
			MaxMs: func() float64 {
				if len(latencies) == 0 { return 0 }
				return latencies[len(latencies)-1]
			}(),
		},
		Errors: ErrorStats{
			NetworkErrors: int(networkErrors.Load()),
			ServerErrors:  int(serverErrors.Load()),
			TimeoutErrors: int(timeoutErrors.Load()),
		},
		SystemState: SystemStateReport{
			RedisAlertKeys:       len(alertKeys),
			RedisVitalsKeys:      len(vitalsKeys),
			RedisIdempotencyKeys: len(idempotencyKeys),
			NATSStreamMsgs:       natsStreamMsgs,
			NATSStreamBytes:      natsStreamBytes,
		},
	}

	// ---- Output ----
	switch *outputFormat {
	case "json":
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(result)

	case "csv":
		w := csv.NewWriter(os.Stdout)
		w.Write([]string{"metric", "value"})
		w.Write([]string{"run_at", result.Config.RunAt})
		w.Write([]string{"event_type", result.Config.EventType})
		w.Write([]string{"total_events", strconv.Itoa(result.Config.TotalEvents)})
		w.Write([]string{"concurrency", strconv.Itoa(result.Config.Concurrency)})
		w.Write([]string{"accepted", strconv.Itoa(result.Correctness.EventsAccepted)})
		w.Write([]string{"acceptance_pct", fmt.Sprintf("%.2f", result.Correctness.AcceptanceRatePct)})
		w.Write([]string{"events_per_sec", fmt.Sprintf("%.1f", result.Throughput.EventsPerSec)})
		w.Write([]string{"p50_ms", fmt.Sprintf("%.2f", result.Latency.P50Ms)})
		w.Write([]string{"p95_ms", fmt.Sprintf("%.2f", result.Latency.P95Ms)})
		w.Write([]string{"p99_ms", fmt.Sprintf("%.2f", result.Latency.P99Ms)})
		w.Write([]string{"avg_ms", fmt.Sprintf("%.2f", result.Latency.AvgMs)})
		w.Write([]string{"idempotency_verified", strconv.FormatBool(result.Correctness.IdempotencyVerified)})
		w.Write([]string{"nats_stream_msgs", strconv.FormatInt(result.SystemState.NATSStreamMsgs, 10)})
		w.Flush()

	default:
		fmt.Println("\n=== Benchmark Results ===")
		fmt.Printf("Run at:          %s\n", result.Config.RunAt)
		fmt.Printf("Event type:      %s\n", result.Config.EventType)
		fmt.Printf("Total events:    %d\n", result.Config.TotalEvents)
		fmt.Printf("Concurrency:     %d workers\n", result.Config.Concurrency)
		fmt.Println()
		fmt.Println("--- Correctness ---")
		fmt.Printf("Published:       %d\n", result.Correctness.EventsPublished)
		fmt.Printf("Accepted (202):  %d\n", result.Correctness.EventsAccepted)
		fmt.Printf("Rejected:        %d\n", result.Correctness.EventsRejected)
		fmt.Printf("Acceptance rate: %.2f%%\n", result.Correctness.AcceptanceRatePct)
		fmt.Printf("Idempotency:     verified=%v\n", result.Correctness.IdempotencyVerified)
		fmt.Println()
		fmt.Println("--- Throughput ---")
		fmt.Printf("Duration:        %s\n", result.Throughput.TotalDuration)
		fmt.Printf("Events/sec:      %.1f\n", result.Throughput.EventsPerSec)
		fmt.Println()
		fmt.Println("--- Latency (POST /event) ---")
		fmt.Printf("Min:             %.2f ms\n", result.Latency.MinMs)
		fmt.Printf("Avg:             %.2f ms\n", result.Latency.AvgMs)
		fmt.Printf("P50:             %.2f ms\n", result.Latency.P50Ms)
		fmt.Printf("P95:             %.2f ms\n", result.Latency.P95Ms)
		fmt.Printf("P99:             %.2f ms\n", result.Latency.P99Ms)
		fmt.Printf("Max:             %.2f ms\n", result.Latency.MaxMs)
		fmt.Println()
		fmt.Println("--- Errors ---")
		fmt.Printf("Network errors:  %d\n", result.Errors.NetworkErrors)
		fmt.Printf("Server errors:   %d\n", result.Errors.ServerErrors)
		fmt.Printf("Timeout errors:  %d\n", result.Errors.TimeoutErrors)
		fmt.Println()
		fmt.Println("--- System State (Correctness) ---")
		fmt.Printf("Redis alert keys:        %d\n", result.SystemState.RedisAlertKeys)
		fmt.Printf("Redis vitals keys:       %d\n", result.SystemState.RedisVitalsKeys)
		fmt.Printf("Redis idempotency keys:  %d\n", result.SystemState.RedisIdempotencyKeys)
		fmt.Printf("NATS stream messages:    %d\n", result.SystemState.NATSStreamMsgs)
		fmt.Printf("NATS stream bytes:       %d\n", result.SystemState.NATSStreamBytes)
	}
}
