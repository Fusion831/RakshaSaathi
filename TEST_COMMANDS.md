# RakshaSaathi System Testing Guide

## Quick Start Commands

### 1. START BACKEND (Terminal 1)
```powershell
cd C:\Users\daksh\Projects\SIHHackathon\backend
docker-compose up -d
go run cmd/main.go
```

Expected output:
```
Stream RAKSHASAATHI subjects updated successfully
Connected to NATS JetStream successfully
Durable subscriber fall_processor created for subject fall.detected
Durable subscriber vitals_processor created for subject vitals.updated
Durable subscriber anomaly_processor created for subject anomaly.detected
Durable subscriber sos_processor created for subject sos.triggered
Starting RakshaSaathi server on port 8080
```

---

### 2. START FRONTEND (Terminal 2)
```powershell
cd C:\Users\daksh\Projects\SIHHackathon\frontend
npm install
npm run dev
```

Expected output:
```
VITE v8.0.3  ready in 339 ms
➜  Local:   http://localhost:5173/
```

---

## Testing Endpoints (Terminal 3+)

### 1. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
```

Expected output:
```json
{ "status": "ok" }
```

---

### 2. Test SOS Alert (Instant Critical)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
  -ContentType "application/json" `
  -Body @'
{
  "event_id": "sos-$(Get-Random)",
  "type": "sos.triggered",
  "user_id": "user-123",
  "timestamp": "$(Get-Date -Format 'o')",
  "payload": {"source": "smartwatch_button"}
}
'@
```

**What happens:**
- Backend receives SOS event
- Alert Engine creates `Level_3_Alert` (highest severity, instant escalation)
- NATS publishes to `sos.triggered` subject
- WebSocket broadcasts alert to all connected clients
- Frontend displays `EmergencyAlertModal` 

---

### 3. Test Fall Detection
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
  -ContentType "application/json" `
  -Body @'
{
  "event_id": "fall-$(Get-Random)",
  "type": "fall.detected",
  "user_id": "user-123",
  "timestamp": "$(Get-Date -Format 'o')",
  "payload": {
    "confidence": 0.95,
    "location": "living_room"
  }
}
'@
```

**What happens:**
- Alert escalation begins (FALL_DETECTED → waits 30s → LEVEL_1 → LEVEL_2 → LEVEL_3)
- WebSocket sends real-time updates
- Frontend shows escalating alert severity

---

### 4. Test Anomaly Detection
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
  -ContentType "application/json" `
  -Body @'
{
  "event_id": "anomaly-$(Get-Random)",
  "type": "anomaly.detected",
  "user_id": "user-123",
  "timestamp": "$(Get-Date -Format 'o')",
  "payload": {
    "severity": "MEDIUM",
    "metric": "heart_rate",
    "message": "Heart rate spike from 70 to 155 BPM detected"
  }
}
'@
```

**What happens:**
- Creates WARNING-level alert (WAITING_CONFIRMATION state)
- Frontend shows `WarningToast` notification
- Alert resolves automatically after 8 seconds

---

### 5. Stream Vitals Data (Every 1 min, 20 records needed for ML)
```powershell
for ($i = 0; $i -lt 20; $i++) {
  $timestamp = (Get-Date).AddMinutes(-20 + $i).ToString("o")
  $hr = 70 + (Get-Random -Minimum -5 -Maximum 10)
  $spo2 = 96 + (Get-Random -Minimum -2 -Maximum 3)
  $temp = 36.8 + (Get-Random -Minimum -0.5 -Maximum 0.5)
  
  Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" `
    -Body @"
{
  "event_id": "vitals-`$(Get-Random)",
  "type": "vitals.updated",
  "user_id": "user-123",
  "timestamp": "$timestamp",
  "payload": {
    "heart_rate": $hr,
    "spo2": $spo2,
    "steps": $(Get-Random -Minimum 100 -Maximum 1000),
    "temperature": $temp,
    "sleep_status": 0
  }
}
"@
  
  Write-Host "Sent vitals #$i - HR: $hr, SpO2: $spo2, Temp: $temp"
  Start-Sleep -Seconds 1
}
```

---

### 6. Test WebSocket Connection (Verify Real-Time Streaming)

**Using PowerShell WebSocket Client:**

```powershell
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource
$ws.ConnectAsync("ws://localhost:8080/ws", $cts.Token).Wait()

Write-Host "✓ Connected to WebSocket"

# Listen for messages (runs indefinitely until Ctrl+C)
$buffer = New-Object byte[] 1024

while ($ws.State -eq "Open") {
  $result = $ws.ReceiveAsync($buffer, $cts.Token).Result
  $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
  
  if ($message) {
    Write-Host "📡 Received: $message"
  }
  
  Start-Sleep -Milliseconds 100
}

$ws.Dispose()
```

---

## Full Scenario: End-to-End Test

### Step 1: Open Frontend in Browser
```
http://localhost:5173/
```
Navigate to **"Family Dashboard"**

### Step 2: Stream 20 Normal Vitals
Run the vitals streaming command above.
Observe data populating in the Dashboard cards.

### Step 3: Trigger SOS Alert
Run the SOS test command.
**Expected:** 
- Modal pops up immediately
- Red "SOS TRIGGERED" banner on frontend
- Backend logs show `Level_3_Alert`

### Step 4: Trigger Fall Detection
Run the fall detection command.
**Expected:**
- Warning toast appears
- Backend escalates every 30s
- Severity increases from MEDIUM → HIGH

### Step 5: Trigger Continuous Anomalies
```powershell
while ($true) {
  Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" `
    -Body @'
{
  "event_id": "anomaly-$(Get-Random)",
  "type": "anomaly.detected",
  "user_id": "user-123",
  "timestamp": "$(Get-Date -Format 'o')",
  "payload": {
    "severity": "MEDIUM",
    "metric": "heart_rate",
    "message": "Abnormal vitals detected"
  }
}
'@
  
  Start-Sleep -Seconds 3
}
```

---

## Verify Real-Time Streaming

### Check Backend Logs
```powershell
# Should show continuous output indicating event processing
# Example:
# [VitalsProcessor] Successfully stored vitals for user: user-123
# New Anomaly Alert initiated: alert:user-123:1775197686
# WS Client registered
# alert.created broadcast sent
```

### Check Frontend Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)
4. You should see a persistent connection to `ws://localhost:8080/ws`
5. In **Messages** tab, you'll see real-time JSON payloads being received

---

## Docker Compose Health Check

```powershell
docker-compose ps
```

Expected:
```
NAME                  SERVICE             STATUS
backend-postgres-1    postgres            Up
backend-redis-1       redis               Up
backend-nats-1        nats                Up
backend-backend-1     backend             Up
```

---

## Troubleshooting

### Backend won't start
```powershell
# Check if port 8080 is already in use
netstat -ano | findstr :8080

# Kill existing process
taskkill /PID <PID> /F

# Restart
cd backend && go run cmd/main.go
```

### Frontend won't load
```powershell
# Clear npm cache and reinstall
cd frontend
npm cache clean --force
npm install
npm run dev
```

### WebSocket not connecting
- Check CORS is enabled (it is in main.go)
- Verify backend is running on 8080
- Check browser console for errors (F12)
- Try refreshing the page

### Events not processing
```powershell
# Check NATS is running
docker logs backend-nats-1

# Check PostgreSQL is running
docker logs backend-postgres-1

# Check Redis is running
docker logs backend-redis-1
```

---

## Key Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /health | Verify backend is alive |
| GET | /ws | WebSocket connection (real-time updates) |
| POST | /event | Ingest events (vitals, SOS, fall, anomaly) |
| GET | /alerts/:id | Fetch specific alert details |
| POST | /alerts/:id/acknowledge | Manually resolve an alert |
