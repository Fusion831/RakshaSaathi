# RakshaSaathi — System Architecture & Development Context

## 1. PROJECT OVERVIEW

RakshaSaathi is a real-time, AI-powered elderly healthcare monitoring system designed to detect emergencies, monitor health patterns, and ensure timely intervention through an intelligent escalation pipeline.

The system focuses on:
- Fall detection
- Vitals anomaly detection
- Activity monitoring
- Automated emergency response

This is NOT a passive dashboard system.
This is an ACTIVE RESPONSE SYSTEM.

---

## 2. CORE OBJECTIVE

Build a distributed, event-driven system that:

1. Detects critical events (fall, anomaly)
2. Validates them (context + timing)
3. Escalates intelligently
4. Ensures response even in failure scenarios

---

## 3. CURRENT DEVELOPMENT SCOPE (MVP)

We are currently building the backend orchestration system.

### INCLUDED:
- Event-driven backend (Go)
- Alert state machine (core logic)
- NATS JetStream event streaming
- Redis state management
- PostgreSQL persistence
- WebSocket real-time updates
- Event ingestion API

### EXCLUDED (FOR NOW):
- Real telephony (calls)
- Full ML pipeline (basic placeholder later)
- Hardware integration (mocked)

---

## 4. FINAL SYSTEM ARCHITECTURE (VISION)

### Edge Layer
- CCTV Camera → Pose Detection (Python)
- Wearable Devices → Vitals (HR, SpO2, Temp)
- Edge Agent → Publishes events

### Messaging Layer
- NATS JetStream
- Subjects:
  - vitals.updated
  - fall.detected
  - anomaly.detected
  - alert.*

### Backend Layer (Go)
- Event ingestion
- Alert engine (state machine)
- Notification orchestration
- API + WebSocket server

### ML Layer (Future)
- FastAPI service
- LSTM-based anomaly detection
- Consumes vitals events
- Publishes anomaly events

### Storage Layer
- Redis → real-time state
- PostgreSQL → logs + history

### Frontend
- React dashboard
- Real-time alerts
- Escalation timeline

---

## 5. SYSTEM DESIGN PRINCIPLES

### 1. Event-Driven Architecture
All components communicate via NATS events.

NO direct service-to-service coupling.

---

### 2. Edge-First Processing
- Video never leaves device
- Only processed metadata (keypoints) is transmitted

---

### 3. Fault Tolerance
- At-least-once event delivery
- State recovery via Redis/Postgres
- Retry-safe processing

---

### 4. Idempotency & Tiered Storage
- **Event Deduplication**: 24-hour Redis-based `event_id` tracking.
- **Hot Path**: Raw vitals in Redis (2-hour TTL) for ML and Incident Snapshots (last 10m).
- **Warm Path**: Downsampled health trends (5m intervals) in PostgreSQL.

---

### 5. Low Latency
- Real-time detection → response within seconds via NATS + Go.

---

## 6. CORE COMPONENT: ALERT ENGINE

This is the MOST critical part of the system.

### State Machine:

IDLE  
→ FALL_DETECTED  
→ WAITING_CONFIRMATION (30 seconds)  
→ LEVEL_1_ALERT  
→ LEVEL_2_ALERT  
→ LEVEL_3_ALERT  

---

### Behavior:

- Fall or anomaly triggers alert and captures **Incident Context** (10m vitals).
- System waits for acknowledgment.
- If no response → escalate every 30 seconds.
- Each stage triggers notifications.

---

### Requirements:

- Deterministic transitions
- Time-based escalation
- Persistent state (Redis)
- Recoverable after restart
- No duplicate escalation

---

## 7. EVENT FLOW

### Fall Detection Flow

1. CV Service publishes:
   fall.detected

2. Backend consumes event
3. Alert created
4. State machine starts
5. Escalation triggered if no response

---

### Vitals Flow (Future)

1. Device publishes:
   vitals.updated

2. ML Service consumes
3. ML publishes:
   anomaly.detected

4. Backend triggers alert

---

## 8. EVENT CONTRACTS (HIGH LEVEL)

### Event

- event_id (unique)
- type (string)
- timestamp
- user_id
- payload (JSON)

---

### Alert

- alert_id
- user_id
- current_state
- created_at
- updated_at

---

## 9. CURRENT IMPLEMENTATION PRIORITY

### Phase 1 (NOW)
- Alert engine (state machine)
- NATS integration
- Redis state persistence

---

### Phase 2
- API layer
- WebSocket updates
- Frontend integration

---

### Phase 3
- ML service integration
- Vitals processing

---

### Phase 4
- Notification services (SMS, call)
- Hardware integration

---

## 10. WHAT DEFINES SUCCESS

The system is successful if:

1. A fall event is triggered
2. Alert is created immediately
3. System escalates automatically
4. No duplicate alerts occur
5. System recovers after failure
6. Frontend reflects real-time state

---

## 11. WHAT THIS PROJECT IS NOT

- Not a dashboard-only system
- Not ML-heavy research
- Not dependent on constant internet
- Not a single-service backend

---

## 12. DESIGN DECISIONS

### Why Go?
- High concurrency
- Low latency
- Strong for event-driven systems

---

### Why NATS JetStream?
- Lightweight
- Persistent streaming
- At-least-once delivery
- Edge-compatible

---

### Why Redis?
- Fast state management
- TTL for timeouts

---

### Why PostgreSQL?
- Reliable persistent storage
- Audit logs

---

## 13. FUTURE EXTENSIONS

- Personalized ML models
- Federated learning
- Real telephony integration
- Doctor dashboards
- Predictive health analytics

---

## 14. FINAL STATEMENT

This system is designed as a real-time healthcare response platform, not just a monitoring tool.

The primary value lies in:
- Immediate detection
- Intelligent escalation
- Guaranteed response

Everything else is secondary.

# ML & Data Pipeline Context — LSTM Integration

## 1. Overview

The system incorporates an LSTM-based anomaly detection model to analyze physiological time-series data and detect deviations in user behavior.

The ML service operates as an independent microservice integrated via NATS.

---

## 2. Dataset Strategy

### Training Data

* Use full dataset (e.g., PhysioNet)
* Each patient treated as a sequence
* Extract relevant signals:

  * Heart Rate
  * Temperature
  * Respiratory Rate (optional)

---

## 3. Feature Augmentation

To align with wearable capabilities, we augment the dataset with:

* SpO₂ (simulated)
* Activity (derived from HR + temporal patterns)
* Acceleration (derived from activity)

---

## 4. Sequence Generation

* Window size: 20 timesteps
* Sliding window approach
* Each sequence predicts next timestep

---

## 5. Training Pipeline

1. Load dataset
2. Clean missing values
3. Normalize features
4. Generate sequences
5. Train LSTM model
6. Save trained model (.pt)

---

## 6. Inference Pipeline

1. Backend publishes vitals.updated
2. ML service consumes event
3. Retrieve recent sequence from Redis
4. Normalize using user baseline
5. Run LSTM prediction
6. Compute prediction error
7. Publish anomaly.detected

---

## 7. Personalization

* Global model trained once
* Each user has a baseline profile:

  * mean and std per feature
* Used to normalize inputs during inference

---

## 8. Integration with Backend

### Event Flow:

vitals.updated → ML Service → anomaly.detected → Alert Engine

---

## 9. Justification

LSTM is chosen because:

* captures temporal dependencies
* detects sequence-level anomalies
* works well with time-series physiological data

---

## 10. System Benefits

* Real-time anomaly detection
* Personalized monitoring
* Reduced false positives via temporal modeling
* Scalable architecture (decoupled ML service)

---

## 11. Future Enhancements

* Online learning
* Adaptive thresholds
* Multi-modal fusion (vision + vitals)
* Federated personalization
