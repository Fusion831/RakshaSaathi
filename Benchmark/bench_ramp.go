// bench_ramp.go — Progressive load ramp test for RakshaSaathi
//
// Sends events in escalating waves. At each level it measures:
//   - Acceptance rate  (HTTP 202 / total sent)
//   - Pipeline completion rate (SPECIFIC event successfully processed in Redis / accepted)
//   - Timeout count (events that never made it through in deadline)
//   - Full-pipeline P50/P95/P99 latency
//   - NATS true consumer backlog (via /jsz?consumers=true: NumPending + NumAckPending)
//
// Breaking-point detection:
//   A level is declared DEGRADED  when pipeline completion < 95% or P99 > 500ms
//   A level is declared FAILED    when pipeline completion < 80%  or HTTP errors > 5%
//   The test stops after 2 consecutive FAILED levels.
//
// Ramp schedule (configurable via -ramp flag):
//   Default: 1,5,10,25,50,100,250,500,1000,2500,5000
//
// Usage:
//   go run bench_ramp.go [flags]
//
// Flags:
//   -url         Backend URL          (default http://localhost:8080)
//   -redis       Redis address         (default localhost:6379)
//   -nats-mon    NATS monitor URL      (default http://localhost:8222)
//   -concurrency Max concurrent workers (default 100)
//   -timeout-ms  Per-event poll timeout (default 3000)
//   -type        fall|sos|anomaly|vitals (default fall)

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
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

// ── Event ────────────────────────────────────────────────────────────────────

type Event struct {
	EventID   string          `json:"event_id"`
	Type      string          `json:"type"`
	UserID    string          `json:"user_id"`
	Timestamp time.Time       `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

func makeEvent(evType, userID string, seq int) Event {
	var payload json.RawMessage
	switch evType {
	case "fall.detected":
		payload = json.RawMessage(fmt.Sprintf(`{"confidence":%.2f,"location":"living_room"}`, 0.7+rand.Float64()*0.3))
	case "sos.triggered":
		payload = json.RawMessage(`{"trigger":"manual","location":"bedroom"}`)
	case "anomaly.detected":
		payload = json.RawMessage(`{"severity":"MEDIUM","metric":"heart_rate","message":"Elevated HR"}`)
	default:
		evType = "vitals.updated"
		payload = json.RawMessage(fmt.Sprintf(
			`{"heart_rate":%.1f,"spo2":%.1f,"temperature":%.1f,"steps":%d,"sleep_status":0}`,
			60.0+rand.Float64()*40.0, 94.0+rand.Float64()*6.0, 36.0+rand.Float64()*2.0, rand.Intn(5000),
		))
	}
	return Event{
		EventID:   fmt.Sprintf("ramp-%s-%d-%d", userID, seq, time.Now().UnixNano()),
		Type:      evType,
		UserID:    userID,
		Timestamp: time.Now(),
		Payload:   payload,
	}
}

func isAlertType(t string) bool {
	return t == "fall.detected" || t == "sos.triggered" || t == "anomaly.detected"
}

var consumerNameMap = map[string]string{
	"fall.detected":    "fall_processor",
	"sos.triggered":    "sos_processor",
	"anomaly.detected": "anomaly_processor",
	"vitals.updated":   "vitals_processor",
}

// ── Percentile ───────────────────────────────────────────────────────────────

func pct(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	r := p * float64(len(sorted)-1)
	lo := int(r)
	if lo >= len(sorted)-1 {
		return sorted[len(sorted)-1]
	}
	return sorted[lo]*(1-(r-float64(lo))) + sorted[lo+1]*(r-float64(lo))
}

// ── NATS True Consumer Backlog Monitor ──────────────────────────────────────

type natsJsz struct {
	AccountDetails []struct {
		StreamDetail []struct {
			Name           string `json:"name"`
			ConsumerDetail []struct {
				Name          string `json:"name"`
				NumPending    int64  `json:"num_pending"`
				NumAckPending int64  `json:"num_ack_pending"`
				NumRedelivered int64 `json:"num_redelivered"`
			} `json:"consumer_detail"`
		} `json:"stream_detail"`
	} `json:"account_details"`
}

type ConsumerLag struct {
	NumPending    int64 // Messages in stream not yet delivered to consumer
	NumAckPending int64 // Messages delivered but unacknowledged (in-flight)
	TotalLag      int64 // Total unprocessed backlog
}

func natsConsumerLag(monURL, consumerName string) ConsumerLag {
	if monURL == "" {
		return ConsumerLag{}
	}
	r, err := http.Get(monURL + "/jsz?consumers=true")
	if err != nil {
		return ConsumerLag{}
	}
	defer r.Body.Close()
	body, _ := io.ReadAll(r.Body)
	var jsz natsJsz
	if json.Unmarshal(body, &jsz) != nil {
		return ConsumerLag{}
	}
	for _, acc := range jsz.AccountDetails {
		for _, st := range acc.StreamDetail {
			if st.Name == "RAKSHASAATHI" {
				for _, cd := range st.ConsumerDetail {
					if cd.Name == consumerName {
						return ConsumerLag{
							NumPending:    cd.NumPending,
							NumAckPending: cd.NumAckPending,
							TotalLag:      cd.NumPending + cd.NumAckPending,
						}
					}
				}
			}
		}
	}
	return ConsumerLag{}
}

// ── Deterministic Redis Verification (O(1), zero false positives) ───────────

func pollRedis(ctx context.Context, rdb *redis.Client, ev Event, timeout time.Duration) (latMs float64, found bool) {
	deadline := time.Now().Add(timeout)
	start := time.Now()
	for time.Now().Before(deadline) {
		if isAlertType(ev.Type) {
			// Deterministic check: AlertEngine sets "processed:<EventID>" in Redis via SetNX.
			// This is an O(1) lookup tied specifically to THIS event instance.
			if n, _ := rdb.Exists(ctx, "processed:"+ev.EventID).Result(); n > 0 {
				return time.Since(start).Seconds() * 1000, true
			}
		} else {
			// For vitals: VitalsProcessor writes to sorted set "vitals:<UserID>" with score = Timestamp.Unix()
			key := fmt.Sprintf("vitals:%s", ev.UserID)
			scoreStr := fmt.Sprintf("%d", ev.Timestamp.Unix())
			count, _ := rdb.ZCount(ctx, key, scoreStr, scoreStr).Result()
			if count > 0 {
				return time.Since(start).Seconds() * 1000, true
			}
		}
		time.Sleep(150 * time.Microsecond)
	}
	return timeout.Seconds() * 1000, false
}

// ── Level result ─────────────────────────────────────────────────────────────

const (
	StatusOK       = "OK"
	StatusDegraded = "DEGRADED"
	StatusFailed   = "FAILED"
)

type LevelResult struct {
	Events        int     `json:"events"`
	Concurrency   int     `json:"concurrency"`
	Status        string  `json:"status"`
	DurationMs    float64 `json:"duration_ms"`
	ThroughputEPS float64 `json:"throughput_eps"`
	// HTTP layer
	Accepted   int     `json:"accepted"`
	HTTPErrors int     `json:"http_errors"`
	AcceptPct  float64 `json:"accept_pct"`
	// Pipeline layer (strictly verified)
	PipelineOK  int     `json:"pipeline_ok"`
	TimedOut    int     `json:"timed_out"`
	PipelinePct float64 `json:"pipeline_pct"`
	// Latency (full pipeline: POST sent -> Redis processed:<event_id> visible)
	P50 float64 `json:"p50"`
	P95 float64 `json:"p95"`
	P99 float64 `json:"p99"`
	Min float64 `json:"min"`
	Max float64 `json:"max"`
	Avg float64 `json:"avg"`
	// True NATS consumer lag
	ConsumerName string `json:"consumer_name"`
	PeakLag      int64  `json:"peak_lag"`      // Max (NumPending + NumAckPending) under load
	RemainingLag int64  `json:"remaining_lag"` // Messages still unACKed after test
}

// ── Run one level ────────────────────────────────────────────────────────────

func runLevel(
	backendURL string, rdb *redis.Client, client *http.Client,
	evType string, numEvents, maxConc int, pollTimeout time.Duration,
	natsMonURL string,
) LevelResult {
	ctx := context.Background()
	conc := numEvents
	if conc > maxConc {
		conc = maxConc
	}

	consumerName := consumerNameMap[evType]

	// Clean Redis
	for _, pat := range []string{"alert:alert:ramp_*", "vitals:ramp_*", "processed:ramp-*"} {
		if keys, _ := rdb.Keys(ctx, pat).Result(); len(keys) > 0 {
			rdb.Del(ctx, keys...)
		}
	}
	time.Sleep(30 * time.Millisecond)

	// Build events (strictly unique EventID per event)
	events := make([]Event, numEvents)
	for i := 0; i < numEvents; i++ {
		events[i] = makeEvent(evType, fmt.Sprintf("ramp_user_%d", i), i)
	}

	// Dynamic NATS consumer lag sampler
	var peakLag atomic.Int64
	stopSampler := make(chan struct{})
	go func() {
		ticker := time.NewTicker(25 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-stopSampler:
				return
			case <-ticker.C:
				lag := natsConsumerLag(natsMonURL, consumerName)
				if lag.TotalLag > peakLag.Load() {
					peakLag.Store(lag.TotalLag)
				}
			}
		}
	}()

	type result struct {
		accepted bool
		found    bool
		latMs    float64
	}
	results := make([]result, numEvents)

	var httpErrors, accepted atomic.Int64
	ch := make(chan int, numEvents)
	var wg sync.WaitGroup

	start := time.Now()
	for w := 0; w < conc; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for seq := range ch {
				ev := events[seq]
				data, _ := json.Marshal(ev)
				resp, err := client.Post(backendURL+"/event", "application/json", bytes.NewReader(data))
				if err != nil {
					httpErrors.Add(1)
					results[seq] = result{accepted: false}
					continue
				}
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()

				if resp.StatusCode != 202 {
					httpErrors.Add(1)
					results[seq] = result{accepted: false}
					continue
				}
				accepted.Add(1)

				// Deterministic check: poll strictly for THIS event instance
				lat, found := pollRedis(ctx, rdb, ev, pollTimeout)
				results[seq] = result{accepted: true, found: found, latMs: lat}
			}
		}()
	}
	for i := range events {
		ch <- i
	}
	close(ch)
	wg.Wait()
	dur := time.Since(start)

	// Stop lag sampling
	close(stopSampler)
	finalLag := natsConsumerLag(natsMonURL, consumerName)
	peak := peakLag.Load()
	if finalLag.TotalLag > peak {
		peak = finalLag.TotalLag
	}

	acc := int(accepted.Load())
	herr := int(httpErrors.Load())
	var latencies []float64
	var timedOut, pipeOK int
	for _, r := range results {
		if r.accepted && r.found {
			pipeOK++
			latencies = append(latencies, r.latMs)
		}
		if r.accepted && !r.found {
			timedOut++
		}
	}

	sort.Float64s(latencies)
	var sumLat float64
	for _, l := range latencies {
		sumLat += l
	}
	avg := 0.0
	if len(latencies) > 0 {
		avg = sumLat / float64(len(latencies))
	}

	acceptPct := 0.0
	if numEvents > 0 {
		acceptPct = 100.0 * float64(acc) / float64(numEvents)
	}
	pipePct := 0.0
	if acc > 0 {
		pipePct = 100.0 * float64(pipeOK) / float64(acc)
	}

	// Determine status
	httpErrPct := 100.0 * float64(herr) / float64(numEvents)
	status := StatusOK
	p99Val := pct(latencies, 0.99)
	if pipePct < 95.0 || p99Val > 500.0 || httpErrPct > 2.0 {
		status = StatusDegraded
	}
	if pipePct < 80.0 || httpErrPct > 5.0 || (acc > 0 && pipeOK == 0) {
		status = StatusFailed
	}

	return LevelResult{
		Events:        numEvents,
		Concurrency:   conc,
		Status:        status,
		DurationMs:    dur.Seconds() * 1000,
		ThroughputEPS: float64(acc) / dur.Seconds(),
		Accepted:      acc,
		HTTPErrors:    herr,
		AcceptPct:     acceptPct,
		PipelineOK:    pipeOK,
		TimedOut:      timedOut,
		PipelinePct:   pipePct,
		P50:           pct(latencies, 0.50),
		P95:           pct(latencies, 0.95),
		P99:           p99Val,
		Min: func() float64 {
			if len(latencies) == 0 {
				return 0
			}
			return latencies[0]
		}(),
		Max: func() float64 {
			if len(latencies) == 0 {
				return 0
			}
			return latencies[len(latencies)-1]
		}(),
		Avg:          avg,
		ConsumerName: consumerName,
		PeakLag:      peak,
		RemainingLag: finalLag.TotalLag,
	}
}

// ── Print ─────────────────────────────────────────────────────────────────────

var statusColors = map[string]string{
	StatusOK:       "[  OK  ]",
	StatusDegraded: "[DEGRAD]",
	StatusFailed:   "[FAILED]",
}

func bar(pct float64, width int) string {
	filled := int(pct / 100.0 * float64(width))
	if filled > width {
		filled = width
	}
	return strings.Repeat("#", filled) + strings.Repeat(".", width-filled)
}

func printLevel(lvl LevelResult, idx int) {
	label := statusColors[lvl.Status]
	fmt.Printf("\n%s  Level %-2d | %6d events @ %3d workers | %.0f ms total | %.0f ev/s\n",
		label, idx+1, lvl.Events, lvl.Concurrency, lvl.DurationMs, lvl.ThroughputEPS)
	fmt.Printf("         HTTP:     %d/%d accepted (%.1f%%)  errors=%d\n",
		lvl.Accepted, lvl.Events, lvl.AcceptPct, lvl.HTTPErrors)
	fmt.Printf("         Pipeline: %d/%d strictly verified (%.1f%%)  timedout=%d\n",
		lvl.PipelineOK, lvl.Accepted, lvl.PipelinePct, lvl.TimedOut)
	if lvl.PipelineOK > 0 {
		fmt.Printf("         Latency:  min=%.1fms  avg=%.1fms  P50=%.1fms  P95=%.1fms  P99=%.1fms  max=%.1fms\n",
			lvl.Min, lvl.Avg, lvl.P50, lvl.P95, lvl.P99, lvl.Max)
	}
	fmt.Printf("         NATS Consumer (%s): peak queue depth=%d msgs, remaining=%d msgs | Redis [%s] %.0f%%\n",
		lvl.ConsumerName, lvl.PeakLag, lvl.RemainingLag, bar(lvl.PipelinePct, 20), lvl.PipelinePct)
}

func printSummaryTable(levels []LevelResult) {
	fmt.Println("\n" + strings.Repeat("=", 115))
	fmt.Println("  RAMP TEST SUMMARY (Deterministic Event Verification & True Consumer Lag)")
	fmt.Println(strings.Repeat("=", 115))
	fmt.Printf("  %-7s %-7s %-8s %-7s %-10s %-8s %-8s %-8s %-8s %-8s %-8s %s\n",
		"Events", "Workers", "EPS", "Acc%", "Pipeline%", "P50(ms)", "P95(ms)", "P99(ms)", "Timeouts", "PeakLag", "RemLag", "Status")
	fmt.Println(strings.Repeat("-", 115))
	for _, lvl := range levels {
		fmt.Printf("  %-7d %-7d %-8.0f %-7.1f %-10.1f %-8.1f %-8.1f %-8.1f %-8d %-8d %-8d %s\n",
			lvl.Events, lvl.Concurrency, lvl.ThroughputEPS,
			lvl.AcceptPct, lvl.PipelinePct,
			lvl.P50, lvl.P95, lvl.P99,
			lvl.TimedOut, lvl.PeakLag, lvl.RemainingLag, lvl.Status)
	}
	fmt.Println(strings.Repeat("=", 115))

	// Breaking point
	for i, lvl := range levels {
		if lvl.Status == StatusFailed {
			fmt.Printf("\n  BREAKING POINT: %d events (level %d)\n", lvl.Events, i+1)
			fmt.Printf("  Failure mode:   pipeline=%.1f%%  timedout=%d  peak_lag=%d  rem_lag=%d  P99=%.1fms\n",
				lvl.PipelinePct, lvl.TimedOut, lvl.PeakLag, lvl.RemainingLag, lvl.P99)
			break
		}
	}
	// Degradation point
	for i, lvl := range levels {
		if lvl.Status == StatusDegraded {
			fmt.Printf("  DEGRADES AT:    %d events (level %d) | Peak consumer queue depth: %d msgs\n",
				lvl.Events, i+1, lvl.PeakLag)
			break
		}
	}
}

// ── main ─────────────────────────────────────────────────────────────────────

func main() {
	backendURL := flag.String("url", "http://localhost:8080", "Backend URL")
	redisAddr := flag.String("redis", "localhost:6379", "Redis address")
	natsMonURL := flag.String("nats-mon", "http://localhost:8222", "NATS monitor URL")
	maxConc := flag.Int("concurrency", 100, "Max concurrent workers")
	timeoutMS := flag.Int("timeout-ms", 3000, "Per-event pipeline timeout ms")
	evTypeShort := flag.String("type", "fall", "Event type: fall|sos|anomaly|vitals")
	rampStr := flag.String("ramp",
		"1,5,10,25,50,100,250,500,1000,2500,5000",
		"Comma-separated ramp schedule")
	flag.Parse()

	evTypeMap := map[string]string{
		"fall":    "fall.detected",
		"sos":     "sos.triggered",
		"anomaly": "anomaly.detected",
		"vitals":  "vitals.updated",
	}
	evType, ok := evTypeMap[*evTypeShort]
	if !ok {
		log.Fatalf("Unknown type %q. Use: fall|sos|anomaly|vitals", *evTypeShort)
	}

	// Parse ramp schedule
	var ramp []int
	for _, s := range strings.Split(*rampStr, ",") {
		s = strings.TrimSpace(s)
		var n int
		fmt.Sscanf(s, "%d", &n)
		if n > 0 {
			ramp = append(ramp, n)
		}
	}

	pollTimeout := time.Duration(*timeoutMS) * time.Millisecond
	ctx := context.Background()

	fmt.Println(strings.Repeat("=", 75))
	fmt.Println("  RakshaSaathi -- Progressive Ramp Load Test (Fixed & Verified)")
	fmt.Println(strings.Repeat("=", 75))
	fmt.Printf("  Backend:       %s\n", *backendURL)
	fmt.Printf("  Event type:    %s (Consumer: %s)\n", evType, consumerNameMap[evType])
	fmt.Printf("  Max workers:   %d\n", *maxConc)
	fmt.Printf("  Poll timeout:  %dms\n", *timeoutMS)
	fmt.Printf("  Ramp schedule: %v\n", ramp)
	fmt.Println()

	// Preflight
	if r, err := http.Get(*backendURL + "/health"); err != nil {
		log.Fatalf("Backend unreachable: %v", err)
	} else {
		r.Body.Close()
		fmt.Println("[OK] Backend reachable")
	}

	rdb := redis.NewClient(&redis.Options{Addr: *redisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Redis unreachable: %v", err)
	}
	fmt.Println("[OK] Redis reachable")

	if r, err := http.Get(*natsMonURL + "/jsz?consumers=true"); err == nil {
		r.Body.Close()
		fmt.Println("[OK] NATS monitoring reachable (/jsz?consumers=true)")
	} else {
		fmt.Println("[WARN] NATS monitoring not reachable — consumer queue lag will be N/A")
	}
	fmt.Println()

	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        *maxConc * 2,
			MaxIdleConnsPerHost: *maxConc * 2,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	var levels []LevelResult
	consecutiveFails := 0

	for i, n := range ramp {
		fmt.Printf("Running level %d/%d: %d events...\n", i+1, len(ramp), n)
		lvl := runLevel(*backendURL, rdb, client, evType, n, *maxConc, pollTimeout, *natsMonURL)
		printLevel(lvl, i)
		levels = append(levels, lvl)

		if lvl.Status == StatusFailed {
			consecutiveFails++
			if consecutiveFails >= 2 {
				fmt.Printf("\n*** STOPPING: %d consecutive FAILED levels — system broken ***\n", consecutiveFails)
				break
			}
		} else {
			consecutiveFails = 0
		}

		// Cool-down between levels so NATS consumers can drain
		cooldown := 1 * time.Second
		if n > 500 {
			cooldown = 3 * time.Second
		}
		if n > 2000 {
			cooldown = 5 * time.Second
		}
		fmt.Printf("  [cooldown %v]\n", cooldown)
		time.Sleep(cooldown)
	}

	printSummaryTable(levels)

	// Save JSON
	type Output struct {
		Timestamp string                 `json:"timestamp"`
		Config    map[string]interface{} `json:"config"`
		Levels    []LevelResult          `json:"levels"`
	}
	out := Output{
		Timestamp: time.Now().Format(time.RFC3339),
		Config: map[string]interface{}{
			"backend_url": *backendURL,
			"event_type":  evType,
			"consumer":    consumerNameMap[evType],
			"max_workers": *maxConc,
			"timeout_ms":  *timeoutMS,
			"ramp":        ramp,
		},
		Levels: levels,
	}
	if f, err := os.Create("ramp_results.json"); err == nil {
		enc := json.NewEncoder(f)
		enc.SetIndent("", "  ")
		enc.Encode(out)
		f.Close()
		fmt.Println("\n[OK] Results saved to ramp_results.json")
	}
}
