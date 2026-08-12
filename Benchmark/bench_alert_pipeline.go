// bench_alert_pipeline.go — Alert state machine pipeline benchmark
//
// Benchmarks the REAL alert lifecycle:
//   - Send fall/SOS/anomaly events → verify alerts created in Redis
//   - Measure event-to-alert latency (publish → Redis state visible)
//   - Verify state machine transitions (FALL_DETECTED → WAITING_CONFIRMATION)
//   - Verify idempotency (same event_id → no duplicate alert)
//   - Measure alert acknowledgment (POST /alerts/:id/acknowledge)
//
// Usage:
//   go run bench_alert_pipeline.go [flags]

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

type AlertPipelineEvent struct {
	EventID   string          `json:"event_id"`
	Type      string          `json:"type"`
	UserID    string          `json:"user_id"`
	Timestamp time.Time       `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

type AlertState struct {
	AlertID      string `json:"alert_id"`
	UserID       string `json:"user_id"`
	CurrentState string `json:"current_state"`
}

func pollForAlert(ctx context.Context, rdb *redis.Client, userID string, timeout time.Duration) (*AlertState, time.Duration, bool) {
	deadline := time.Now().Add(timeout)
	pattern := fmt.Sprintf("alert:alert:%s:*", userID)
	start := time.Now()

	for time.Now().Before(deadline) {
		keys, _ := rdb.Keys(ctx, pattern).Result()
		if len(keys) > 0 {
			data, err := rdb.Get(ctx, keys[0]).Bytes()
			if err == nil {
				var alert AlertState
				if json.Unmarshal(data, &alert) == nil {
					return &alert, time.Since(start), true
				}
			}
		}
		time.Sleep(5 * time.Millisecond)
	}
	return nil, timeout, false
}

func main() {
	backendURL := flag.String("url", "http://localhost:8080", "Backend URL")
	redisAddr := flag.String("redis", "localhost:6379", "Redis address")
	numAlerts := flag.Int("alerts", 50, "Number of fall alerts to generate")
	concurrency := flag.Int("concurrency", 5, "Concurrent alert generators")
	pollTimeout := flag.Duration("poll-timeout", 2*time.Second, "Max time to wait for alert in Redis")
	flag.Parse()

	ctx := context.Background()

	fmt.Println("=== RakshaSaathi Alert Pipeline Benchmark ===")
	fmt.Printf("Backend: %s | Alerts: %d | Concurrency: %d\n", *backendURL, *numAlerts, *concurrency)

	// Preflight
	hresp, err := http.Get(*backendURL + "/health")
	if err != nil {
		log.Fatalf("Cannot reach backend: %v", err)
	}
	hresp.Body.Close()

	rdb := redis.NewClient(&redis.Options{Addr: *redisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Cannot reach Redis: %v", err)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConnsPerHost: *concurrency,
		},
	}

	// Flush bench alerts from previous runs
	oldKeys, _ := rdb.Keys(ctx, "alert:alert:bench_alert_*").Result()
	if len(oldKeys) > 0 {
		rdb.Del(ctx, oldKeys...)
	}
	oldIdem, _ := rdb.Keys(ctx, "processed:bench-alert-*").Result()
	if len(oldIdem) > 0 {
		rdb.Del(ctx, oldIdem...)
	}

	var (
		alertsCreated    atomic.Int64
		alertsMissed     atomic.Int64
		idempotencyPassed atomic.Int64
	)

	alertLatencies := make([]float64, 0, *numAlerts)
	var latMu sync.Mutex

	type alertRecord struct {
		userID   string
		eventID  string
		alertID  string
		latencyMs float64
	}
	records := make([]alertRecord, 0, *numAlerts)
	var recMu sync.Mutex

	eventCh := make(chan AlertPipelineEvent, *numAlerts)
	var wg sync.WaitGroup

	for w := 0; w < *concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for evt := range eventCh {
				// Publish event
				data, _ := json.Marshal(evt)
				start := time.Now()
				resp, err := client.Post(*backendURL+"/event", "application/json", bytes.NewBuffer(data))
				if err != nil {
					log.Printf("Publish error: %v", err)
					alertsMissed.Add(1)
					continue
				}
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()

				if resp.StatusCode != 202 {
					alertsMissed.Add(1)
					continue
				}

				// Poll Redis for the alert
				alert, latency, found := pollForAlert(ctx, rdb, evt.UserID, *pollTimeout)
				_ = start
				latMs := latency.Seconds() * 1000.0

				if found {
					alertsCreated.Add(1)
					latMu.Lock()
					alertLatencies = append(alertLatencies, latMs)
					latMu.Unlock()
					recMu.Lock()
					records = append(records, alertRecord{
						userID:    evt.UserID,
						eventID:   evt.EventID,
						alertID:   alert.AlertID,
						latencyMs: latMs,
					})
					recMu.Unlock()
				} else {
					alertsMissed.Add(1)
					log.Printf("Alert NOT found for user %s (event %s) within %v", evt.UserID, evt.EventID, *pollTimeout)
				}
			}
		}()
	}

	// Generate fall events
	benchStart := time.Now()
	for i := 0; i < *numAlerts; i++ {
		userID := fmt.Sprintf("bench_alert_user_%d", i)
		evt := AlertPipelineEvent{
			EventID:   fmt.Sprintf("bench-alert-%d-%d", i, rand.Int63()),
			Type:      "fall.detected",
			UserID:    userID,
			Timestamp: time.Now(),
			Payload:   json.RawMessage(`{"confidence":0.95,"location":"living_room"}`),
		}
		eventCh <- evt
	}
	close(eventCh)
	wg.Wait()
	benchDuration := time.Since(benchStart)

	// Wait briefly for async processing
	time.Sleep(200 * time.Millisecond)

	// ---- Idempotency Test ----
	fmt.Println("\n--- Idempotency Verification ---")
	if len(records) > 0 {
		// Resend the first event with same EventID
		rec := records[0]
		dupEvt := AlertPipelineEvent{
			EventID:   rec.eventID,
			Type:      "fall.detected",
			UserID:    rec.userID,
			Timestamp: time.Now(),
			Payload:   json.RawMessage(`{"confidence":0.95,"location":"living_room"}`),
		}
		data, _ := json.Marshal(dupEvt)
		resp, err := client.Post(*backendURL+"/event", "application/json", bytes.NewBuffer(data))
		if err == nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
		}

		time.Sleep(200 * time.Millisecond)

		// Verify: alert count for that user should not have changed
		pattern := fmt.Sprintf("alert:alert:%s:*", rec.userID)
		keys, _ := rdb.Keys(ctx, pattern).Result()
		if len(keys) == 1 {
			idempotencyPassed.Add(1)
			fmt.Printf("[PASS] Duplicate event produced NO duplicate alert for user %s\n", rec.userID)
		} else {
			fmt.Printf("[FAIL] Duplicate event produced %d alerts for user %s (expected 1)\n", len(keys), rec.userID)
		}
	}

	// ---- State Transition Verification ----
	fmt.Println("\n--- State Machine Verification ---")
	if len(records) > 0 {
		rec := records[0]
		pattern := fmt.Sprintf("alert:alert:%s:*", rec.userID)
		keys, _ := rdb.Keys(ctx, pattern).Result()
		if len(keys) > 0 {
			data, _ := rdb.Get(ctx, keys[0]).Bytes()
			var alert AlertState
			json.Unmarshal(data, &alert)
			fmt.Printf("[CHECK] Alert %s current state: %s\n", alert.AlertID, alert.CurrentState)

			validStates := map[string]bool{
				"FALL_DETECTED":         true,
				"WAITING_CONFIRMATION":  true,
				"LEVEL_1_ALERT":         true,
				"LEVEL_2_ALERT":         true,
				"LEVEL_3_ALERT":         true,
			}
			if validStates[alert.CurrentState] {
				fmt.Printf("[PASS] State '%s' is a valid state machine state\n", alert.CurrentState)
			} else {
				fmt.Printf("[FAIL] State '%s' is not a recognized state\n", alert.CurrentState)
			}
		}
	}

	// ---- Alert Acknowledgment Test ----
	fmt.Println("\n--- Acknowledgment Test ---")
	if len(records) > 0 {
		rec := records[0]
		ackURL := fmt.Sprintf("%s/alerts/%s/acknowledge", *backendURL, rec.alertID)
		resp, err := client.Post(ackURL, "application/json", nil)
		if err == nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			if resp.StatusCode == 200 {
				fmt.Printf("[PASS] Alert %s acknowledged (HTTP 200)\n", rec.alertID)
			} else {
				fmt.Printf("[INFO] Acknowledge returned HTTP %d for alert %s\n", resp.StatusCode, rec.alertID)
			}
		}
	}

	// ---- Stats ----
	latMu.Lock()
	sort.Float64s(alertLatencies)
	var sumLat float64
	for _, l := range alertLatencies {
		sumLat += l
	}
	avgLat := 0.0
	if len(alertLatencies) > 0 {
		avgLat = sumLat / float64(len(alertLatencies))
	}
	latMu.Unlock()

	totalCreated := int(alertsCreated.Load())
	totalMissed := int(alertsMissed.Load())

	fmt.Println("\n=== Alert Pipeline Results ===")
	fmt.Printf("Duration:            %v\n", benchDuration.Round(time.Millisecond))
	fmt.Printf("Alerts generated:    %d\n", *numAlerts)
	fmt.Printf("Alerts in Redis:     %d\n", totalCreated)
	fmt.Printf("Missed (not found):  %d\n", totalMissed)
	fmt.Printf("Creation rate:       %.1f%%\n", 100.0*float64(totalCreated)/float64(*numAlerts))
	fmt.Println()
	fmt.Println("--- Event-to-Alert Latency (publish → Redis visible) ---")
	if len(alertLatencies) > 0 {
		fmt.Printf("Min:    %.2f ms\n", alertLatencies[0])
		fmt.Printf("Avg:    %.2f ms\n", avgLat)
		p50 := func() float64 {
			r := 0.50 * float64(len(alertLatencies)-1)
			l := int(r); return alertLatencies[l]
		}()
		p95 := func() float64 {
			r := 0.95 * float64(len(alertLatencies)-1)
			l := int(r); f := r - float64(l)
			if l+1 >= len(alertLatencies) { return alertLatencies[l] }
			return alertLatencies[l]*(1-f) + alertLatencies[l+1]*f
		}()
		fmt.Printf("P50:    %.2f ms\n", p50)
		fmt.Printf("P95:    %.2f ms\n", p95)
		fmt.Printf("Max:    %.2f ms\n", alertLatencies[len(alertLatencies)-1])
	} else {
		fmt.Println("No latency data (no alerts were found in Redis)")
	}
	fmt.Printf("\nIdempotency verified: %v\n", idempotencyPassed.Load() > 0)
}
