## Git Integration & Conflict Resolution (CRITICAL)

The frontend and backend exist in different states and may have merge conflicts.

Your task is to safely integrate both without breaking functionality.

---

### Rules for Conflict Resolution

* NEVER overwrite backend logic blindly
* NEVER delete working frontend code
* ALWAYS merge changes carefully

---

### Strategy

1. Pull latest changes from remote
2. Identify conflicts between frontend and backend
3. Resolve conflicts manually by:

   * preserving backend architecture (Go services, NATS, Redis, alert engine)
   * preserving frontend UI structure and styling
4. Ensure APIs match between frontend and backend

---

### Integration Requirements

* Align frontend API calls with backend endpoints
* Fix mismatched schemas
* Ensure WebSocket events are correctly consumed
* Remove unused or conflicting routes

---

### Safety Constraints

* Do NOT force push
* Do NOT reset repository
* Do NOT delete large sections of code
* Prefer incremental merges

---

### Goal

After resolving conflicts:

* frontend builds successfully
* backend runs without errors
* APIs match
* real-time updates work
* no broken features

---

If uncertain:

* preserve both versions
* refactor instead of deleting


# RakshakAI — Core System Context

## Objective

RakshakAI is a real-time healthcare monitoring and emergency response system.

The system:

* ingests wearable and environmental data
* detects anomalies or incidents
* triggers a deterministic alert escalation pipeline
* communicates alerts (including SOS) reliably
* reflects everything in real-time on the frontend

---

## System Positioning

RakshakAI integrates with existing wearable ecosystems:

* Apple Watch (via Apple Health)
* Google Fit
* Other wearable APIs

We do NOT build custom hardware.

For development/demo:

* wearable data is simulated via API
* architecture supports real-world integration

---

## Data Ingestion Layer

Wearables transmit:

* heart_rate
* spo2
* steps / activity
* timestamp

Endpoint:

POST /ingest/wearable

Payload:
{
"user_id": "string",
"heart_rate": number,
"spo2": number,
"steps": number,
"timestamp": string
}

---

## Architecture

Frontend (React + TypeScript)
↓
Backend (Go API + WebSocket)
↓
Event Bus (NATS JetStream)
↓
Alert Engine
↓
(ML Service optional)

---

## Real-Time System

The system must stream via WebSocket:

Events:

* vitals.live
* alert.created
* alert.escalated
* alert.resolved
* sos.triggered

Frontend must update instantly.

---

## Alert Engine (Core Logic)

Alert lifecycle:

IDLE
→ LEVEL_1_ALERT
→ LEVEL_2_ALERT
→ LEVEL_3_ALERT

Each level must:

* update backend state
* broadcast via WebSocket
* reflect on frontend immediately

---

## SOS System (ALREADY WORKING — DO NOT BREAK)

SOS notifications:

* are already implemented
* must remain functional
* must be properly communicated frontend ↔ backend

Ensure:

* SOS triggers correct alert level
* frontend reflects SOS state clearly
* WebSocket emits sos.triggered event

---

## Demo Control (CRITICAL)

System must support deterministic demo triggers.

Endpoints:

POST /simulate/fall
POST /simulate/anomaly

POST /simulate/alert/level1
POST /simulate/alert/level2
POST /simulate/alert/level3

These must:

* trigger corresponding alert levels
* update backend state
* emit WebSocket events
* update frontend instantly

---

## API Requirements

### Ingestion

POST /ingest/wearable

---

### Alerts

GET /alerts
GET /alerts/{id}
POST /alerts/{id}/acknowledge

---

### Vitals

GET /vitals/realtime
GET /vitals/history

---

### Simulation

POST /simulate/fall
POST /simulate/anomaly
POST /simulate/alert/level1
POST /simulate/alert/level2
POST /simulate/alert/level3

---

## Backend Responsibilities

* validate incoming data
* publish events to NATS
* maintain alert state (Redis or memory)
* broadcast via WebSocket
* ensure idempotency

---

## Frontend Responsibilities

* connect to backend APIs
* subscribe to WebSocket
* render:

  * live vitals
  * alert levels
  * escalation timeline
  * SOS alerts

---

## UI/UX Requirements (IMPORTANT)

If required UI components do NOT exist:

You are allowed to:

* create new widgets/components
* add dashboards or panels

BUT:

* follow existing frontend color scheme
* maintain design consistency
* do NOT redesign entire UI

---

## Data Consistency

All responses must follow consistent schema:

{
"user_id": "string",
"status": "SAFE | ALERT",
"alert_level": "NONE | L1 | L2 | L3",
"vitals": {
"heart_rate": number,
"spo2": number,
"steps": number
}
}

---

## Twilio (Placeholder Only)

Add:

triggerEmergencyCalls()

* do NOT implement yet
* add TODO for Twilio
* trigger only at LEVEL_3_ALERT

---

## Constraints

* do NOT introduce new frameworks
* do NOT break working backend logic
* do NOT remove SOS functionality
* do NOT rewrite entire frontend

---

## Priority Order

1. frontend ↔ backend integration
2. WebSocket real-time updates
3. simulation endpoints
4. alert + SOS flow consistency
5. UI completeness

---

## Instructions to Copilot

You are allowed to:

* refactor code
* fix integration issues
* align APIs
* create missing UI components

You must:

* preserve architecture
* maintain working features
* ensure system is demo-ready

---

## Goal

Make the system:

* fully integrated
* real-time
* stable
* visually complete
* ready for demonstration
