# RakshaSaathi

<div align="center">

  ![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=for-the-badge&logo=go&logoColor=white)
  ![NATS](https://img.shields.io/badge/NATS_JetStream-2.10-27B5EA?style=for-the-badge&logo=nats&logoColor=white)
  ![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
  ![PyTorch](https://img.shields.io/badge/PyTorch-2.0-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)

  **High-Reliability Emergency Telemetry & Alert Platform for Independent Seniors**

  *Event-driven architecture designed to process sub-second health metrics, detect emergency falls, and execute zero-duplicate alert escalations under heavy concurrent load.*

</div>

---

## 🎯 Executive Summary & Problem Solved

**"RakshaSaathi"** (*"Raksha"* = Protection, *"Saathi"* = Companion) is an open-source health telemetry platform built for seniors living independently.

### The Real-World Problem
Elderly individuals living alone face severe health risks during unmonitored emergencies such as sudden falls, cardiac distress, or rapid drops in blood oxygen ($SpO_2$).
- **Surveillance Intrusion:** Video cameras are invasive and compromise personal privacy in private living spaces.
- **Delayed Intervention:** Manual check-in calls occur hours apart, leaving fallen seniors unattended during critical windows.
- **Backend Vulnerability Under Spike Traffic:** Standard HTTP APIs drop events during traffic surges or trigger duplicate emergency calls due to network retries—spamming family members and emergency responders.

### The Solution
RakshaSaathi delivers a privacy-first, event-driven telemetry backend that ingests continuous sensor data, executes real-time anomaly checks, and manages a deterministic multi-level escalation workflow (family $\rightarrow$ emergency contacts $\rightarrow$ medical services) with sub-50ms latency and guaranteed idempotency.

---

## 🚀 Key Measured Metrics

> *Benchmarked on native production backend infrastructure under concurrent load testing.*

| Metric | Result | Engineering Impact |
| :--- | :--- | :--- |
| **Telemetry Ingestion Throughput** | **~22,500 events/sec** | Sustained intake across 50 concurrent worker routines |
| **Ingestion API Latency (P99)** | **< 5.0 ms** | Sub-5ms response time on `POST /event` endpoint |
| **Fall Detection Alert Latency** | **P50: 6.5 ms \| P95: < 50 ms** | Time from fall event arrival to active state in Redis |
| **Ingestion Acceptance Rate** | **100.0%** | Zero lost requests across 5,000+ continuous test payloads |
| **Alert Idempotency** | **100% Duplicate Prevention** | Atomic Redis locks (`SetNX`) block duplicate emergency calls |
| **Emergency SOS Override** | **< 10 ms** | Bypasses escalation queue to trigger Level-3 emergency status |

---

## 🏗️ Architecture & Data Pipeline

```
  [ Wearable / IoT Device ]
             │
             ▼
   ┌───────────────────┐
   │   POST /event     │  <-- Gin Engine (Go 1.24)
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  NATS JetStream   │  <-- File-Backed Durable Stream (RAKSHASAATHI)
   └─────────┬─────────┘
             │
     ┌───────┴───────────────────────┐
     ▼                               ▼
┌──────────────────┐       ┌──────────────────┐
│  Vitals Worker   │       │   Alert Engine   │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│   Redis ZSet     │       │   Redis Hashes   │  <-- Hot Storage (2-Hour Window / States)
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│  PyTorch LSTM    │       │ WebSocket Stream │  <-- Live Family Dashboard
└──────────────────┘       └────────┬─────────┘
                                    │ (Every 5 mins)
                                    ▼
                           ┌──────────────────┐
                           │   PostgreSQL     │  <-- Cold Storage (Downsampled Rollups)
                           └──────────────────┘
```

---

## 💡 System Design & Engineering Tradeoffs

### 1. NATS JetStream for Message Durability
* **Tradeoff:** Direct HTTP / In-memory channels are faster to write, but crash state is unrecoverable.
* **Solution:** We selected NATS JetStream with durable consumers and manual acknowledgments (`m.Ack()` / `m.Nak()`). If a worker routine fails during processing, JetStream automatically redelivers unacknowledged messages upon process restart, preventing lost emergency notifications.

### 2. Dual-Tier Storage (Redis Hot Tier + Postgres Cold Tier)
* **Tradeoff:** Writing sub-second telemetry directly to PostgreSQL causes write-amplification and slows real-time dashboard queries.
* **Solution:** 
  * **Hot Path (Redis):** Continuous vitals are ingested into Redis sorted sets (`ZADD`) with a 2-hour sliding window, enabling sub-millisecond retrieval for time-series ML inference.
  * **Cold Path (PostgreSQL):** An asynchronous background aggregator runs every 5 minutes, downsampling high-frequency Redis metrics into aggregated statistical records (avg/min/max HR and $SpO_2$) stored permanently in PostgreSQL.

### 3. Atomic Idempotency Engine
* **Tradeoff:** At-least-once message queues can deliver duplicate packets during network jitter.
* **Solution:** Every inbound alert is routed through an atomic Redis lock (`SetNX processed:{event_id} 1 EX 86400`). Duplicate payloads are acknowledged and safely discarded before entering the escalation state machine.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Core** | Go 1.24 + Gin | Concurrent event routing & high-throughput API ingress |
| **Event Stream** | NATS JetStream 2.10 | File-backed durable event persistence & message queues |
| **Hot Storage** | Redis 7.0 | Time-series sliding window, active alert state & idempotency locks |
| **Cold Storage** | PostgreSQL 15 | Aggregated historical health metrics & long-term audit trail |
| **ML Inference** | PyTorch + FastAPI | LSTM-based anomaly detection on windowed vitals |
| **Real-Time UI** | Gorilla WebSockets | Low-latency live feed to family & caregiver dashboards |

---

## ⚡ Quick Start & Verification

### 1. Launch Infrastructure Services
```bash
cd backend
docker compose -p rakshasaathi up -d postgres redis nats
```

### 2. Run Go Backend Core
```bash
cd backend
go run cmd/main.go
```

### 3. Run Non-Mocked Benchmark Suite
```bash
cd Benchmark
# Execute E2E Ingestion Benchmark (5,000 events, 50 workers)
go run bench_e2e.go -events 5000 -concurrency 50 -type vitals

# Execute Alert Pipeline & Idempotency Benchmark
go run bench_alert_pipeline.go -alerts 30 -concurrency 5
```

---

## 🔌 Core API Endpoints

### Ingest Telemetry / Event
```http
POST /event
Content-Type: application/json

{
  "event_id": "evt-fall-10492",
  "type": "fall.detected",
  "user_id": "user-elderly-88",
  "timestamp": "2026-08-13T00:30:00Z",
  "payload": {
    "confidence": 0.96,
    "location": "living_room"
  }
}
```
**Response:** `202 Accepted`

### Health Check
```http
GET /health
```
**Response:** `{"status": "ok"}`

---

## 📊 System Limitations & Next Steps

* **Escalation Timer Storage:** Current state machine escalation steps rely on Go goroutines. A production migration to Redis-backed timer wheels will ensure timers survive full system restarts.
* **Multi-User Aggregator Scaling:** Background aggregator is currently set up for single-user validation loops; expanding to worker-pool key scanning (`SCAN`) will enable multi-tenant scalability.
* **Authentication:** Next phase includes JWT device authentication and TLS transport encryption.
