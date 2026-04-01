# RakshaSaathi Backend Architecture

## 1. System Overview
RakshaSaathi is an event-driven backend designed for real-time elderly monitoring. It uses a clean architecture approach to separate concerns and ensure high reliability during emergencies.

## 2. Technical Stack
- **Language**: Go 1.22+
- **Messaging**: NATS JetStream (Durable, persistent events)
- **Real-time State**: Redis (Alert state machine & TTL tracking)
- **Primary Database**: PostgreSQL (Historical logs & user profiles)
- **API Framework**: Gin Gonic (REST & Health checks)
- **WebSockets**: Gorilla WebSockets (Alert streaming to dashboard)

## 3. Directory Structure
- `cmd/`: Application entry point.
- `internal/config/`: Configuration & environment variables.
- `internal/models/`: Core data structures and event contracts.
- `internal/nats/`: JetStream manager for reliable messaging.
- `internal/repositories/`: Data access layer for PostreSQL & Redis.
- `internal/services/`: Business logic and escalation engine (Alert transitions).
- `internal/handlers/`: HTTP and WebSocket entry points.

## 4. Key Workflows
### A. Event Ingestion
1. Edge devices (CCTV/Wearable) publish events to NATS subjects (e.g., `vitals.updated`).
2. The Go backend consumes these events via **Durable Consumers**.
3. If an anomaly is detected, it triggers the **Alert Service**.

### B. Alert Escalation (State Machine)
Alerts transition through states:
`TRIGGERED` -> `VERIFYING` -> `ESCALATED` -> `RESOLVED`
- **Redis** tracks the current state with a **TTL**.
- If a state doesn't transition before the TTL expires, the system auto-escalates.

### C. Dashboard Updates
1. When an alert state change occurs, a message is published to the `alert.*` subject.
2. The WebSocket handler subscribes to these updates and pushes them to the connected React dashboard in real-time.

---

## 5. Development Commands
- **Run the app**: `go run cmd/main.go`
- **Run all tests**: `go test ./internal/...`
- **Tidy dependencies**: `go mod tidy`
