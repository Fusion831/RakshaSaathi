# Complete Data Flow with Database & Event Bus Details

## Event Journey Through the System

```
Timeline: T=0 to T=90 seconds

T=0s   Frontend clicks "Trigger Fall"
        │
        ├─→ POST /event with:
        │   {
        │     "event_id": "ev-1234567890",
        │     "type": "fall.detected",
        │     "user_id": "user-123",
        │     "timestamp": "2026-04-03T15:30:45.123Z",
        │     "payload": {
        │       "confidence": 0.95,
        │       "location": "Living Room"
        │     }
        │   }
        │
        ├─→ Backend Handler.PostEvent()
        │   - Deserializes JSON to models.BaseEvent
        │   - Calls natsMgr.PublishBaseEvent("fall.detected", event)
        │
T=1ms   ├─→ NATS JetStream receives message
        │   - Routes to stream: RAKSHASAATHI
        │   - Subject: fall.detected
        │   - Message persisted to disk (FileStorage)
        │
        ├─→ fall_processor consumer receives message
        │   - Unmarshals BaseEvent from message payload
        │   - Calls AlertEngine.HandleEvent(ctx, event)
        │
T=2ms   ├─→ AlertEngine.HandleEvent()
        │   - Check Redis idempotency: processed:ev-1234567890
        │   - Set processed:ev-1234567890 = "1" with 24h TTL
        │
        ├─→ Switch on event.type = "fall.detected"
        │   → Call initiateFallAlert(ctx, event)
        │
T=3ms   ├─→ AlertEngine.initiateFallAlert()
        │   1. Create Alert object:
        │      {
        │        ID: uuid(),
        │        UserID: "user-123",
        │        EventID: "ev-1234567890",
        │        Type: "FALL_DETECTED",
        │        Severity: "HIGH",
        │        State: "LEVEL_1",      ← First escalation level
        │        Timestamp: now(),
        │        Context: { ... }
        │      }
        │
        │   2. Save to PostgreSQL:
        │      INSERT INTO alerts (
        │        id, user_id, event_id, type, severity, 
        │        state, timestamp, context
        │      ) VALUES (...)
        │
        │   3. Save to Redis hot storage:
        │      HSET alert:ALERTID {
        │        user_id: "user-123",
        │        state: "LEVEL_1",
        │        severity: "HIGH",
        │        created_at: unix_timestamp,
        │        ...
        │      }
        │      EXPIRE alert:ALERTID 3600  (1 hour)
        │
        │   4. Start escalation timer:
        │      SET escalation:ALERTID:next_level "LEVEL_2"
        │      EXPIRE escalation:ALERTID:next_level 30  (30 seconds)
        │
        │   5. Broadcast to WebSocket:
        │      broadcaster.BroadcastEvent("alert.escalated", {
        │        "alert_id": ALERTID,
        │        "state": "LEVEL_1",
        │        "severity": "HIGH",
        │        "description": "Fall detected in Living Room"
        │      })
        │
T=10ms  ├─→ Frontend receives WebSocket message:
        │   {
        │     "type": "alert.escalated",
        │     "payload": {
        │       "alert_id": "...",
        │       "state": "LEVEL_1",
        │       ...
        │     }
        │   }
        │   → Display EmergencyAlertModal
        │
                    [32 seconds of waiting...]
        │
T=33s   ├─→ Escalation Timer Fires (30 second interval)
        │   - Check Redis key: escalation:ALERTID:next_level
        │   - Current state: LEVEL_1 → Next state: LEVEL_2
        │   - Update PostgreSQL:
        │     UPDATE alerts 
        │     SET state = 'LEVEL_2', 
        │         escalation_count = escalation_count + 1
        │     WHERE id = ALERTID
        │
        │   - Update Redis:
        │     HSET alert:ALERTID state "LEVEL_2"
        │     EXPIRE alert:ALERTID 3600
        │
        │   - Broadcast new state:
        │     broadcaster.BroadcastEvent("alert.escalated", {
        │       "state": "LEVEL_2",
        │       "escalation_level": 2,
        │       ...
        │     })
        │
        │   - Schedule next escalation to LEVEL_3:
        │     SET escalation:ALERTID:next_level "LEVEL_3"
        │     EXPIRE escalation:ALERTID:next_level 30
        │
T=35s   ├─→ Frontend receives escalation update
        │   → Modal text updates to show LEVEL_2 escalation
        │   → UI colors change to indicate severity increase
        │
                    [30 more seconds...]
        │
T=63s   ├─→ Final Escalation: LEVEL_1 → LEVEL_2 → LEVEL_3
        │   - Similar process as T=33s
        │   - Final state: LEVEL_3 (Critical)
        │   - Frontend receives LEVEL_3 update
        │   → Modal shows "EMERGENCY - DISPATCHING SERVICES NOW"
        │
T=90s   └─→ [User interaction possible]
          ├─ User acknowledges alert → Frontend sends
          │  POST /alerts/{id}/acknowledge
          │  → Backend updates alert state to RESOLVED
          │  → Stops escalation timer
          │  → Broadcasts alert.resolved to all clients
          │
          └─ Or alert auto-resolves after 1 hour (Redis TTL)
```

---

## Database State Snapshots

### PostgreSQL (`alerts` table)

#### After Fall Detection (T=3ms)
```sql
INSERT INTO alerts (
  id, 
  user_id, 
  event_id, 
  type, 
  severity, 
  state, 
  timestamp, 
  escalation_count,
  acknowledged_at,
  context
) VALUES (
  'alert-abc123',
  'user-123',
  'ev-1234567890',
  'FALL_DETECTED',
  'HIGH',
  'LEVEL_1',
  '2026-04-03 15:30:45.123Z',
  0,
  NULL,
  {
    "location": "Living Room",
    "confidence": 0.95,
    "source": "fall.detected",
    "initial_handler": "fall_processor"
  }
);
```

#### After First Escalation (T=33s)
```sql
UPDATE alerts 
SET 
  state = 'LEVEL_2',
  escalation_count = 1,
  timestamp_escalated_1 = '2026-04-03 15:31:15.123Z'
WHERE id = 'alert-abc123';
```

#### After Final Escalation (T=63s)
```sql
UPDATE alerts 
SET 
  state = 'LEVEL_3',
  escalation_count = 2,
  timestamp_escalated_2 = '2026-04-03 15:31:45.123Z'
WHERE id = 'alert-abc123';
```

---

### Redis Hot Storage

#### T=3ms - Alert Created
```redis
# Alert state snapshot (1 hour TTL)
HSET alert:alert-abc123 \
  user_id "user-123" \
  type "FALL_DETECTED" \
  state "LEVEL_1" \
  severity "HIGH" \
  created_at 1712157045 \
  context '{"location":"Living Room",...}'

EXPIRE alert:alert-abc123 3600

# Idempotency check
SET processed:ev-1234567890 "1"
EXPIRE processed:ev-1234567890 86400  # 24 hours

# Escalation timer
SET escalation:alert-abc123:next_level "LEVEL_2"
EXPIRE escalation:alert-abc123:next_level 30

# Active alerts list (for dashboard)
SADD active_alerts:user-123 "alert-abc123"
```

#### T=33s - First Escalation
```redis
# Update alert state
HSET alert:alert-abc123 \
  state "LEVEL_2" \
  escalation_count 1 \
  timestamp_escalated_1 "2026-04-03T15:31:15.123Z"

# Schedule next escalation
SET escalation:alert-abc123:next_level "LEVEL_3"
EXPIRE escalation:alert-abc123:next_level 30
```

#### T=63s - Final Escalation
```redis
# Update to critical state
HSET alert:alert-abc123 \
  state "LEVEL_3" \
  escalation_count 2 \
  timestamp_escalated_2 "2026-04-03T15:31:45.123Z"

# No more escalations beyond LEVEL_3
DEL escalation:alert-abc123:next_level
```

#### User Acknowledges (T=65s)
```redis
# Alert acknowledged
HSET alert:alert-abc123 \
  state "RESOLVED" \
  acknowledged_at "2026-04-03T15:31:47.200Z"

# Remove from active alerts
SREM active_alerts:user-123 "alert-abc123"
```

---

## NATS Event Stream Details

### Stream: RAKSHASAATHI

```
Name: RAKSHASAATHI
Type: Standard
Subjects:
  - fall.detected
  - vitals.updated
  - anomaly.detected
  - sos.triggered
  - alert.*
  
Storage: FileStorage (persisted to disk at ~/.nats/RAKSHASAATHI/)
MaxAge: (default - stores until disk space)
Replication: 1 (no replication in single-broker setup)
```

### Consumer: fall_processor

```
Consumer Name: fall_processor
Subject Filter: fall.detected
Delivery Policy: Manual (waits for application acknowledgment)
AckPolicy: ExactOnce
MaxDeliver: 5 (retries failed messages up to 5 times)
State: Active

Message Flow:
1. Message published to fall.detected
2. fall_processor reads message
3. Handler processes message
4. Calls m.Ack() → Message marked complete
5. Or calls m.Nak() → Message requeued
6. Or returns error → Automatic retry
```

### Example Messages in Stream

#### Message 1: Fall Detection Event
```json
Subject: fall.detected
Timestamp: 2026-04-03T15:30:45.123Z
Data: {
  "event_id": "ev-1234567890",
  "type": "fall.detected",
  "user_id": "user-123",
  "timestamp": "2026-04-03T15:30:45.123Z",
  "payload": {
    "confidence": 0.95,
    "location": "Living Room"
  }
}
```

#### Message 2: Vitals Update Event
```json
Subject: vitals.updated
Timestamp: 2026-04-03T15:30:50.456Z
Data: {
  "event_id": "ev-1234567891",
  "type": "vitals.updated",
  "user_id": "user-123",
  "timestamp": "2026-04-03T15:30:50.456Z",
  "payload": {
    "heart_rate": 95.5,
    "blood_oxygen": 96.8,
    "body_temperature": 37.2,
    "activity_level": 3.5,
    "acceleration": 0.25,
    "sleep_status": 0
  }
}
```

#### Message 3: Anomaly Detection Event
```json
Subject: anomaly.detected
Timestamp: 2026-04-03T15:30:57.789Z
Data: {
  "event_id": "ev-1234567892",
  "type": "anomaly.detected",
  "user_id": "user-123",
  "timestamp": "2026-04-03T15:30:57.789Z",
  "payload": {
    "severity": "MEDIUM",
    "metric": "heart_rate",
    "anomaly_score": 0.87,
    "message": "Heart rate spike detected"
  }
}
```

---

## WebSocket Message Flow

### Connection Phase
```
Client → Server: WebSocket upgrade request
GET /ws
Upgrade: websocket
Connection: Upgrade

Server → Client: 101 Switching Protocols
Connection established
Client registered with WSBroadcaster
```

### Real-time Event Broadcasting

#### Event 1: Alert Escalation
```json
Server → Client {
  "type": "alert.escalated",
  "payload": {
    "alert_id": "alert-abc123",
    "user_id": "user-123",
    "state": "LEVEL_1",
    "severity": "HIGH",
    "description": "Fall detected in Living Room",
    "timestamp": "2026-04-03T15:30:45.123Z"
  }
}
```

#### Event 2: Live Vitals
```json
Server → Client {
  "type": "vitals.live",
  "payload": {
    "user_id": "user-123",
    "timestamp": "2026-04-03T15:30:50.456Z",
    "vitals": {
      "heart_rate": 95.5,
      "blood_oxygen": 96.8,
      "body_temperature": 37.2,
      "activity_level": 3.5,
      "acceleration": 0.25,
      "sleep_status": 0
    }
  }
}
```

#### Event 3: SOS Triggered (Immediate LEVEL_3)
```json
Server → Client {
  "type": "sos.triggered",
  "payload": {
    "alert_id": "alert-xyz789",
    "user_id": "user-123",
    "state": "LEVEL_3",
    "severity": "CRITICAL",
    "description": "SOS Emergency Triggered",
    "timestamp": "2026-04-03T15:31:02.890Z",
    "immediate_dispatch": true
  }
}
```

---

## ML Service Integration

### Vitals Processor → ML Check Flow

```
T=0ms   VitalsProcessor receives vitals.updated event
        {
          heart_rate: 95.5,
          blood_oxygen: 96.8,
          body_temperature: 37.2,
          activity_level: 3.5,
          acceleration: 0.25,
          sleep_status: 0
        }

T=1ms   Store in Redis:
        ZADD {user-123}:vitals \
          UNIX_TIMESTAMP \
          "{\\"hr\\":95.5,\\"spO2\\":96.8,...}"
        EXPIRE {user-123}:vitals 7200  # 2 hours

T=2ms   Launch goroutine (async):
        go func() {
          res := mlService.AnalyzeRecentVitals(user-123)
          if res.IsAnomaly {
            // Publish anomaly.detected back to NATS
            natsMgr.PublishBaseEvent("anomaly.detected", {...})
          }
        }()

T=3ms   Return immediately (non-blocking)
        Broadcast vitals.live via WebSocket

T=100ms mlService.AnalyzeRecentVitals() executes:
        1. Fetch recent vitals from Redis (sliding window)
        2. Build 5D feature vector
        3. POST to http://127.0.0.1:8000/predict
           Request body: {
             "features": [[95.5, 96.8, 37.2, 3.5, 0.25, 0]],
             "user_id": "user-123"
           }
        4. Receive result:
           {
             "is_anomaly": true,
             "anomaly_score": 0.87,
             "severity": "MEDIUM"
           }
        5. If is_anomaly: publish anomaly.detected Event

T=105ms anomaly.detected event published to NATS
        Routes to anomaly_processor consumer
        → AlertEngine.initiateAnomalyAlert()
        → Creates MEDIUM severity alert
        → Broadcasts to WebSocket
```

---

## Connection Verification Checklist

### Frontend → Backend
- [ ] HTTP requests return status 202 Accepted
- [ ] WebSocket connects and receives messages
- [ ] CORS headers present in responses
- [ ] Before testing: check `curl http://localhost:8080/health`

### Backend → NATS
- [ ] Backend logs: "Connected to NATS JetStream successfully"
- [ ] Stream "RAKSHASAATHI" exists with correct subjects
- [ ] All 4 consumers show in backend logs on startup
- [ ] Messages appear in stream when events posted

### Backend → Databases
- [ ] PostgreSQL: `SELECT COUNT(*) FROM alerts;` returns rows after test
- [ ] Redis: `KEYS *` shows alert:*, processed:*, escalation:* keys
- [ ] Check Redis TTL: `TTL alert:*` shows remaining time

### Backend → ML Service
- [ ] `curl http://127.0.0.1:8000/health` returns 200
- [ ] ML service receives prediction requests with correct feature count
- [ ] Anomaly detection triggers when expected

### Backend → WebSocket
- [ ] Browser console: `console.log()` shows messages arriving
- [ ] Message types include: alert.escalated, vitals.live, sos.triggered
- [ ] Real-time updates appear immediately (< 100ms latency)

---

## Testing Flow Verification

To verify each connection works, follow this sequence:

```bash
# Terminal 1: Start docker services
docker-compose up -d

# Wait 5 seconds for services to boot
sleep 5

# Terminal 2: Start backend (should show NATS connection and consumer setup)
cd backend
go run ./cmd/main.go

# Terminal 3: Start frontend
cd frontend
npm run dev

# Terminal 4: Run sanity check
powershell -File VERIFY_CONNECTIONS.ps1 -Full

# Terminal 5: Send test event and watch logs
curl -X POST http://localhost:8080/event \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-1",
    "type": "fall.detected",
    "user_id": "user-123",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "payload": {
      "confidence": 0.95,
      "location": "Living Room"
    }
  }'

# Watch backend logs for:
# - "fall_processor received message"
# - "Handling fall event for user-123"
# - "Alert created: alert-XXX with state LEVEL_1"
# - "Broadcasting to WebSocket: alert.escalated"

# Check browser console (Frontend) for:
# - WebSocket message received
# - Modal displayed with fall alert
```

All connections verified when combined output shows complete event journey!
