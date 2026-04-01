# RakshaSaathi Backend Architecture

## 1. System Overview
RakshaSaathi is an event-driven backend designed for real-time elderly monitoring. It uses a clean architecture approach to separate concerns and ensure high reliability during emergencies.

## 2. Technical Stack
- **Language**: Go 1.25+
- **Messaging**: NATS JetStream (Durable, persistent events)
- **Real-time/Live State**: Redis (Alert state machine & Hot vitals storage)
- **Primary Database**: PostgreSQL (Historical alerts & Downsampled vitals)
- **API Framework**: Gin Gonic (REST & Health checks)
- **WebSockets**: Gorilla WebSockets (Real-time alert & vitals streaming)

## 3. Directory Structure
- `cmd/`: Application entry point and dependency injection.
- `internal/config/`: Configuration & environment variables.
- `internal/models/`: Core data structures and event contracts.
- `internal/nats/`: JetStream manager for reliable messaging.
- `internal/repositories/`: Data access layer for PostgreSQL, Redis, and Vitals storage.
- `internal/services/`: Business logic, Alert Engine (Escalation), Vitals Processor, and Aggregator.
- `internal/handlers/`: HTTP and WebSocket entry points.

## 4. Key Workflows
### A. Vitals Ingestion & Tiered Storage
1. **Hot Storage (Redis)**: Wearable devices publish `vitals.updated`. The `VitalsProcessor` stores raw JSON in Redis Sorted Sets (TTL: 2 hours) for immediate ML analysis and real-time dashboarding.
2. **Warm Storage (Postgres)**: A background `VitalsAggregator` runs every 5 minutes, downsampling Redis data (Min, Max, Avg) into the `vitals_aggregated` table for long-term historical graphs.

### B. Alert Escalation (Deterministic State Machine)
- **States**: `IDLE` -> `FALL_DETECTED` -> `WAIT_CONFIRMATION` -> `LEVEL_1` -> `LEVEL_2` -> `LEVEL_3` -> `RESOLVED`.
- **Incident Context**: When a `fall.detected` event occurs, the `AlertEngine` fetches the last 10 minutes of raw vitals from Redis and attaches them to the alert object for healthcare provider review.
- **Idempotency**: All events are guarded by a 24-hour Redis-based idempotency check to prevent duplicate alert triggers.

### C. Dashboard & Real-time Updates
1. **WebSockets**: The dashboard maintains a persistent connection to receive live alerts and vitals.
2. **Escalation**: If an alert isn't acknowledged within 30 seconds, a Go goroutine timer triggers an automatic transition to the next escalation level.

---

## 5. Development Commands
- **Launch Infrastructure**: `docker-compose up -d nats redis postgres`
- **Run the app**: `go run cmd/main.go`
- **Run all tests**: `go test ./...`
- **Tidy dependencies**: `go mod tidy`
