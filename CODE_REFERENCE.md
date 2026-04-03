# Code Reference: Module Connection Points

Quick lookup for file locations and function names that handle each connection.

---

## 1. Frontend → REST API (HTTP POST)

### Frontend Sending Event
**File:** `frontend/src/pages/FamilyDashboard.tsx`

```typescript
// Line 55: Send Fall Detection
const triggerCritical = async () => {
  await fetch("http://localhost:8080/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: "sim-" + Date.now(),
      type: "fall.detected",
      user_id: "user-123",
      timestamp: new Date().toISOString(),
      payload: { confidence: 0.95, location: "Living Room" }
    })
  });
};

// Line 90: Send Anomaly Detection
const triggerWarning = async () => {
  await fetch("http://localhost:8080/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: "sim-" + Date.now(),
      type: "anomaly.detected",
      // ... same structure
    })
  });
};
```

### Backend Receiving Event
**File:** `backend/internal/handlers/handler.go`

```go
// Line 36: HTTP Handler for /event endpoint
func (h *Handler) PostEvent(c *gin.Context) {
    var event models.BaseEvent
    if err := c.ShouldBindJSON(&event); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    if event.Timestamp.IsZero() {
        event.Timestamp = time.Now()
    }
    
    // Publish to NATS
    err := h.natsMgr.PublishBaseEvent(event.Type, event)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish event"})
        return
    }
    
    c.JSON(http.StatusAccepted, gin.H{"message": "event ingested", "event_id": event.EventID})
}
```

**Connection Point:** CORS middleware enables cross-origin requests
- **File:** `backend/cmd/main.go` Line 72
- **Code:** `r.Use(cors.Default())`

---

## 2. Backend → NATS JetStream (Publishing)

### Publishing Event to NATS
**File:** `backend/internal/nats/nats.go`

```go
// Line 88: PublishBaseEvent serializes and publishes to NATS
func (m *JetStreamManager) PublishBaseEvent(subject string, event models.BaseEvent) error {
    data, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }
    
    _, err = m.JS.Publish(subject, data)  // ← Publishes to stream
    if err != nil {
        return fmt.Errorf("failed to publish to NATS: %w", err)
    }
    
    return nil
}
```

### NATS Stream Configuration
**File:** `backend/internal/nats/nats.go`

```go
// Line 60-87: setupStreams() - Creates stream with subjects
func (m *JetStreamManager) setupStreams() error {
    streamName := "RAKSHASAATHI"
    subjects := []string{
        "fall.detected", 
        "vitals.updated", 
        "anomaly.detected", 
        "sos.triggered", 
        "alert.*"
    }
    
    // Create or update stream
    _, err := m.JS.AddStream(&nats.StreamConfig{
        Name:     streamName,
        Subjects: subjects,
        Storage:  nats.FileStorage,
    })
    return err
}
```

### NATS Initialization
**File:** `backend/cmd/main.go`

```go
// Line 36-39: Create NATS manager
natsMgr, err := nats.NewJetStreamManager(cfg)
if err != nil {
    log.Fatal("Could not connect to NATS:", err)
}
defer natsMgr.Close()
```

---

## 3. NATS Consumers → Event Processing

### Fall Detection Consumer
**File:** `backend/cmd/main.go` (startConsumers function)

```go
// Line 110-130: fall_processor consumer
_, err := mgr.SubscribeDurable("fall.detected", "fall_processor", func(m *corenats.Msg) {
    var event models.BaseEvent
    if err := json.Unmarshal(m.Data, &event); err != nil {
        log.Printf("Error unmarshaling fall event: %v", err)
        m.Term()  // ← Terminate on parse error
        return
    }
    
    if err := engine.HandleEvent(ctx, event); err != nil {
        log.Printf("Error handling fall event: %v", err)
        m.Nak()   // ← Retry on error
        return
    }
    m.Ack()  // ← Success
})
```

### Vitals Consumer
**File:** `backend/cmd/main.go` (startConsumers function)

```go
// Line 132-152: vitals_processor consumer
_, err := mgr.SubscribeDurable("vitals.updated", "vitals_processor", func(m *corenats.Msg) {
    var event models.BaseEvent
    if err := json.Unmarshal(m.Data, &event); err != nil {
        m.Term()
        return
    }
    
    if err := vitals.ProcessVitals(event); err != nil {
        m.Nak()
        return
    }
    m.Ack()
})
```

### Anomaly Consumer
**File:** `backend/cmd/main.go` (startConsumers function)

```go
// Line 154-174: anomaly_processor consumer
_, err := mgr.SubscribeDurable("anomaly.detected", "anomaly_processor", func(m *corenats.Msg) {
    // ... same pattern
    engine.HandleEvent(ctx, event)
})
```

### SOS Consumer
**File:** `backend/cmd/main.go` (startConsumers function)

```go
// Line 176-196: sos_processor consumer
_, err := mgr.SubscribeDurable("sos.triggered", "sos_processor", func(m *corenats.Msg) {
    // ... same pattern
    engine.HandleEvent(ctx, event)
})
```

---

## 4. Alert Engine → Event Routing

### Event Handler Entry Point
**File:** `backend/internal/services/alert_engine.go`

```go
// Line 36: HandleEvent dispatches to type-specific handlers
func (e *AlertEngine) HandleEvent(ctx context.Context, event models.BaseEvent) error {
    // Idempotency check
    processedKey := fmt.Sprintf("processed:%s", event.EventID)
    set, err := e.rdb.SetNX(ctx, processedKey, "1", 24*time.Hour).Result()
    
    if !set {
        return nil  // Already processed
    }
    
    // Route to handlers
    switch event.Type {
    case "fall.detected":
        return e.initiateFallAlert(ctx, event)
    case "anomaly.detected":
        return e.initiateAnomalyAlert(ctx, event)
    case "sos.triggered":
        return e.initiateSOSAlert(ctx, event)
    }
    
    return nil
}
```

### Fall Alert Handler
**File:** `backend/internal/services/alert_engine.go`

```go
// Line 60+: initiateFallAlert creates escalating alert
func (e *AlertEngine) initiateFallAlert(ctx context.Context, event models.BaseEvent) error {
    alert := &models.Alert{
        ID:        uuid.New().String(),
        UserID:    event.UserID,
        EventID:   event.EventID,
        Type:      "FALL_DETECTED",
        Severity:  "HIGH",
        State:     "LEVEL_1",
        Timestamp: time.Now(),
    }
    
    // Save to repos
    e.repo.SaveAlert(ctx, alert)
    
    // Broadcast to WebSocket
    e.ws.BroadcastEvent("alert.escalated", alert)
    
    // Start escalation
    go e.escalateAlert(ctx, alert)
    
    return nil
}
```

### Anomaly Alert Handler
**File:** `backend/internal/services/alert_engine.go`

```go
// Line 80+: initiateAnomalyAlert
func (e *AlertEngine) initiateAnomalyAlert(ctx context.Context, event models.BaseEvent) error {
    alert := &models.Alert{
        Type:     "ANOMALY_DETECTED",
        Severity: "MEDIUM",  // ← Different severity
        State:    "LEVEL_1",
    }
    
    e.repo.SaveAlert(ctx, alert)
    e.ws.BroadcastEvent("alert.escalated", alert)
    
    return nil
}
```

### SOS Alert Handler
**File:** `backend/internal/services/alert_engine.go`

```go
// Line 90+: initiateSOSAlert
func (e *AlertEngine) initiateSOSAlert(ctx context.Context, event models.BaseEvent) error {
    alert := &models.Alert{
        Type:     "SOS_TRIGGERED",
        Severity: "CRITICAL",
        State:    "LEVEL_3",  // ← Immediate LEVEL_3, no escalation
    }
    
    e.repo.SaveAlert(ctx, alert)
    e.ws.BroadcastEvent("sos.triggered", alert)
    
    return nil
}
```

---

## 5. Vitals Processor → ML Service Integration

### Process Vitals Entry Point
**File:** `backend/internal/services/vitals_processor.go`

```go
// Line 16: ProcessVitals receives vitals event
func (s *VitalsProcessor) ProcessVitals(event models.BaseEvent) error {
    var vitals models.VitalsData
    err := json.Unmarshal(event.Payload, &vitals)
    
    // Broadcast live vitals
    s.ws.BroadcastEvent("vitals.live", map[string]interface{}{
        "user_id":   event.UserID,
        "timestamp": event.Timestamp,
        "vitals":    vitals,
    })
    
    // Store in Redis
    err = s.vitalsRepo.SaveVitals(event.UserID, event.Timestamp.Unix(), vitals)
    
    // Async ML analysis
    go func() {
        res, err := s.mlService.AnalyzeRecentVitals(event.UserID)
        if err != nil {
            return  // Not enough data
        }
        
        if res.IsAnomaly {
            // Publish anomaly event back to NATS
            // This triggers the anomaly consumer → AlertEngine flow
        }
    }()
    
    return nil
}
```

### ML Service Analysis
**File:** `backend/internal/services/ml_service.go`

```go
// Line 30+: AnalyzeRecentVitals calls FastAPI endpoint
func (s *MLInferenceService) AnalyzeRecentVitals(userID string) (*AnomalyResult, error) {
    // Fetch vitals from Redis
    vitals, err := s.repo.GetRecentVitals(userID, 30)  // Last 30 data points
    
    // Prepare features
    features := prepareFeatures(vitals)  // 5D: HR, SpO2, Temp, Activity, Accel
    
    // Call FastAPI
    resp, err := http.Post(
        s.fastAPIURL+"/predict",
        "application/json",
        bytes.NewReader(features),
    )
    
    // Parse result
    var result AnomalyResult
    json.NewDecoder(resp.Body).Decode(&result)
    
    return &result, nil
}
```

---

## 6. WebSocket Broadcasting

### Broadcaster Initialization
**File:** `backend/cmd/main.go`

```go
// Line 53: Create broadcaster and start
wsBroadcaster := services.NewWSBroadcaster()
go wsBroadcaster.Start()  // ← Runs event loop in background
```

### Broadcaster Event Loop
**File:** `backend/internal/services/ws_broadcaster.go`

```go
// Line 24: Start() runs event loop
func (b *WSBroadcaster) Start() {
    for {
        select {
        case client := <-b.register:
            b.mu.Lock()
            b.clients[client] = true  // ← Add client
            b.mu.Unlock()
            
        case client := <-b.unregister:
            b.mu.Lock()
            delete(b.clients, client)  // ← Remove client
            b.mu.Unlock()
            
        case message := <-b.broadcast:
            b.mu.Lock()
            for client := range b.clients {
                client.WriteMessage(websocket.TextMessage, message)  // ← Send to all
            }
            b.mu.Unlock()
        }
    }
}
```

### Broadcasting Events
**File:** `backend/internal/services/ws_broadcaster.go`

```go
// Line 76: BroadcastEvent formats and sends event
func (b *WSBroadcaster) BroadcastEvent(eventType string, payload interface{}) {
    event := WSEvent{
        Type:    eventType,
        Payload: payload,
    }
    data, _ := json.Marshal(event)
    b.broadcast <- data  // ← Send to event loop
}
```

### WebSocket Upgrade Handler
**File:** `backend/internal/handlers/handler.go`

```go
// Line 60: HandleWebSocket upgrades HTTP to WebSocket
func (h *Handler) HandleWebSocket(c *gin.Context) {
    conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("Could not upgrade to websocket: %v", err)
        return
    }
    
    h.broadcaster.Register(conn)  // ← Add to broadcaster
    defer h.broadcaster.Unregister(conn)
    
    // Keep connection open
    for {
        var msg interface{}
        if err := conn.ReadJSON(&msg); err != nil {
            break  // Client disconnected
        }
    }
}
```

---

## 7. Frontend WebSocket Listener

### WebSocket Hook
**File:** `frontend/src/hooks/useWebSocket.ts`

```typescript
// Line 4: useWebSocket hook establishes connection
export function useWebSocket(url: string) {
    const [messages, setMessages] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    
    useEffect(() => {
        ws.current = new WebSocket(url);  // ← Connect
        ws.current.onopen = () => setIsConnected(true);
        ws.current.onclose = () => setIsConnected(false);
        ws.current.onmessage = (e) => {
            try {
                setMessages(prev => [...prev, JSON.parse(e.data)]);  // ← Store message
            } catch(err) {}
        };
        return () => { ws.current?.close(); };
    }, [url]);
    
    return { messages, isConnected, ws: ws.current };
}
```

### Frontend Event Handler
**File:** `frontend/src/pages/FamilyDashboard.tsx`

```typescript
// Line 22: Connect to backend WebSocket
const { messages, isConnected } = useWebSocket("ws://localhost:8080/ws");

// Line 24: Listen for messages
useEffect(() => {
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        console.log("WS Event Received:", lastMessage);
        
        // Handle alert events
        if (lastMessage.type === "fall.detected" || lastMessage.type === "sos.triggered") {
            setCriticalAlert({  // ← Show emergency modal
                type: lastMessage.type === "sos.triggered" ? "SOS Triggered" : "Critical Alert",
                patient: patientData.name,
                time: new Date().toLocaleTimeString(),
                description: lastMessage.payload?.message || "Immediate attention required.",
                action: "Dispatching emergency services..."
            });
        }
        
        // Handle warning events
        if (lastMessage.type === "anomaly.detected") {
            setWarningAlert({  // ← Show warning toast
                type: "Anomaly Detected",
                description: "System flagged abnormal vital patterns."
            });
            setTimeout(() => setWarningAlert(null), 8000);
        }
    }
}, [messages]);
```

---

## 8. Database Repositories

### Alert Repository (Redis)
**File:** `backend/internal/repositories/alert_repository.go`

```go
// Saves alert to Redis
func (r *AlertRepository) SaveAlert(ctx context.Context, alert *models.Alert) error {
    data, _ := json.Marshal(alert)
    return r.rdb.HSet(ctx, "alert:"+alert.ID, "data", string(data)).Err()
}

// Also saves to PostgreSQL via AlertService
```

### Vitals Repository (Redis)
**File:** `backend/internal/repositories/vitals_repository.go`

```go
// Stores vitals in sorted set (by timestamp)
func (r *VitalsRepository) SaveVitals(userID string, timestamp int64, vitals VitalsData) error {
    data, _ := json.Marshal(vitals)
    return r.rdb.ZAdd(ctx, userID+":vitals", 
        &redis.Z{Score: float64(timestamp), Member: string(data)}).Err()
}

// Retrieves recent vitals for ML analysis
func (r *VitalsRepository) GetRecentVitals(userID string, limit int) ([]VitalsData, error) {
    results, _ := r.rdb.ZRevRange(ctx, userID+":vitals", 0, int64(limit-1)).Result()
    // Parse and return
}
```

### Alert Service (PostgreSQL)
**File:** `backend/internal/services/alert_service.go`

```go
// Gets alert history from PostgreSQL
func (s *AlertService) GetAlertHistory(ctx context.Context, userID string) ([]models.Alert, error) {
    var alerts []models.Alert
    s.db.Where("user_id = ?", userID).Find(&alerts)
    return alerts, nil
}
```

---

## File Organization Summary

```
backend/
  ├── cmd/
  │   └── main.go ← All initialization + Consumer setup
  │
  ├── internal/
  │   ├── handlers/
  │   │   └── handler.go ← HTTP endpoints + WebSocket upgrade
  │   │
  │   ├── services/
  │   │   ├── alert_engine.go ← Event routing + escalation
  │   │   ├── vitals_processor.go ← Vitals storage + ML trigger
  │   │   ├── ml_service.go ← FastAPI client
  │   │   ├── ws_broadcaster.go ← WebSocket broadcasting
  │   │   └── alert_service.go ← PostgreSQL interactions
  │   │
  │   ├── repositories/
  │   │   ├── alert_repository.go ← Redis alert storage
  │   │   ├── vitals_repository.go ← Redis vitals storage
  │   │   └── postgres_db.go ← PostgreSQL connection
  │   │
  │   └── nats/
  │       └── nats.go ← Stream setup + Publishing
  │
  └── internal/models/ ← BaseEvent, Alert, VitalsData structs

frontend/
  ├── src/
  │   ├── hooks/
  │   │   └── useWebSocket.ts ← WebSocket connection
  │   │
  │   ├── pages/
  │   │   └── FamilyDashboard.tsx ← Event sending + Event listening
  │   │
  │   └── components/
  │       └── family/
  │           ├── EmergencyAlertModal.tsx ← Modal for critical alerts
  │           └── WarningToast.tsx ← Toast for warnings
```

---

## Quick Reference: Find X in the Code

**"How does an event flow through the system?"**
1. Start: `frontend/src/pages/FamilyDashboard.tsx` (triggerCritical/triggerWarning)
2. Backend receives: `backend/internal/handlers/handler.go` (PostEvent)
3. Publishes to NATS: `backend/internal/nats/nats.go` (PublishBaseEvent)
4. Consumer processes: `backend/cmd/main.go` (startConsumers)
5. Alert Engine handles: `backend/internal/services/alert_engine.go` (HandleEvent)
6. WebSocket broadcasts: `backend/internal/services/ws_broadcaster.go` (BroadcastEvent)
7. Frontend receives: `frontend/src/hooks/useWebSocket.ts` (onmessage)

**"Where is the database state saved?"**
- Hot data (< 1 hour): `backend/internal/repositories/alert_repository.go` + `vitals_repository.go` (Redis)
- Historical data: `backend/internal/services/alert_service.go` (PostgreSQL)

**"How does ML detection work?"**
- Triggered: `backend/internal/services/vitals_processor.go` (ProcessVitals goroutine)
- Called: `backend/internal/services/ml_service.go` (AnalyzeRecentVitals)
- If anomaly: Publishes back to NATS → Consumed by anomaly_processor → AlertEngine

**"How are users notified in real-time?"**
- WebSocket connection: `backend/internal/handlers/handler.go` (HandleWebSocket)
- Events queued: `backend/internal/services/ws_broadcaster.go` (Start event loop)
- Frontend receives: `frontend/src/hooks/useWebSocket.ts` (onmessage handler)
