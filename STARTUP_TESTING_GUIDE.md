# 🚀 RakshaSaathi - Complete Startup & Testing Guide

## Overview

RakshaSaathi is a **real-time healthcare monitoring system** designed to:
- Detect health anomalies (falls, vitals spikes)
- Trigger immediate emergency response (SOS)
- Stream live alerts to a React dashboard
- Maintain state across PostgreSQL, Redis, and NATS

---

## System Architecture

```
Frontend (React)
      ↓ (HTTP + WebSocket)
Backend (Go)  
      ↓ (Event Publishing)
NATS JetStream (Event Bus)
      ↓
Alert Engine (State Machine)
      ↓
Redis (State) + PostgreSQL (History)
      ↓
WebSocket Broadcast → Frontend (Real-Time)
```

---

## 🏁 Quick Start (Copy-Paste)

### TERMINAL 1: Start Backend
```powershell
cd C:\Users\daksh\Projects\SIHHackathon\backend
docker-compose up -d
go run cmd/main.go
```

**Wait for:**
```
Connected to NATS JetStream successfully
Durable subscriber sos_processor created
[GIN-debug] Listening and serving HTTP on :8080
```

### TERMINAL 2: Start Frontend
```powershell
cd C:\Users\daksh\Projects\SIHHackathon\frontend
npm run dev
```

**Wait for:**
```
VITE v8.0.3  ready in 339 ms
➜  Local:   http://localhost:5173/
```

### TERMINAL 3: Run Tests
Then open **http://localhost:5173** in your browser and run the tests below.

---

## 🧪 Test Scenarios

### TEST 1️⃣: Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
# Expected: { "status": "ok" }
```

### TEST 2️⃣: Trigger SOS Alert (Critical - Instant Level 3)
```powershell
$sos = @{
    event_id = "sos-$(Get-Random)"
    type = "sos.triggered"
    user_id = "user-123"
    timestamp = (Get-Date -Format 'o')
    payload = @{ source = "smartwatch" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" -Body $sos
```

**Expected Frontend Behavior:**
- ✅ EmergencyAlertModal pops up immediately
- ✅ Red "SOS TRIGGERED" banner
- ✅ Backend logs show `Level_3_Alert`

---

### TEST 3️⃣: Trigger Fall Detection (Escalating)
```powershell
$fall = @{
    event_id = "fall-$(Get-Random)"
    type = "fall.detected"
    user_id = "user-123"
    timestamp = (Get-Date -Format 'o')
    payload = @{
        confidence = 0.95
        location = "living_room"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" -Body $fall
```

**Expected Flow:**
1. FALL_DETECTED state (immediate)
2. Wait 30s → LEVEL_1_ALERT
3. Wait 30s → LEVEL_2_ALERT
4. Wait 30s → LEVEL_3_ALERT
5. Frontend escalates visually with each state change

---

### TEST 4️⃣: Trigger Anomaly Detection (Medium Severity)
```powershell
$anomaly = @{
    event_id = "anomaly-$(Get-Random)"
    type = "anomaly.detected"
    user_id = "user-123"
    timestamp = (Get-Date -Format 'o')
    payload = @{
        severity = "MEDIUM"
        metric = "heart_rate"
        message = "Heart rate spike: 70 → 155 BPM"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" -Body $anomaly
```

**Expected Frontend Behavior:**
- ✅ WarningToast notification appears
- ✅ Auto-dismisses after 8 seconds
- ✅ No persistent alert (just a warning)

---

### TEST 5️⃣: Stream Vitals Data (20 readings)
Run this **exact command** - it sends 20 sequential vitals:

```powershell
for ($i = 1; $i -le 20; $i++) {
    $hr = 70 + (Get-Random -Minimum -5 -Maximum 10)
    $spo2 = 96 + (Get-Random -Minimum -1 -Maximum 2)
    $temp = 36.8 + (Get-Random -Minimum -0.2 -Maximum 0.3)
    
    $vitals = @{
        event_id = "vitals-$i"
        type = "vitals.updated"
        user_id = "user-123"
        timestamp = (Get-Date -Format 'o')
        payload = @{
            heart_rate = [float]$hr
            spo2 = [float]$spo2
            steps = Get-Random -Minimum 100 -Maximum 500
            temperature = [float]$temp
            sleep_status = 0
        }
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
        -ContentType "application/json" -Body $vitals
    
    Write-Host "Vital #$i - HR: $hr | SpO2: $spo2 | Temp: $temp"
    Start-Sleep -Milliseconds 500
}
```

**Expected Frontend Behavior:**
- ✅ SummaryCards update with live metrics
- ✅ VitalsSnapshot shows latest readings
- ✅ Dashboard reflects all 5 vital types

---

### TEST 6️⃣: Continuous Anomaly Stream
In a **new terminal**, run this to send anomalies every 3 seconds:

```powershell
while ($true) {
    $anomaly = @{
        event_id = "anomaly-$(Get-Random -Minimum 10000 -Maximum 99999)"
        type = "anomaly.detected"
        user_id = "user-123"
        timestamp = (Get-Date -Format 'o')
        payload = @{
            severity = "MEDIUM"
            metric = @("heart_rate", "spo2", "temperature", "activity") | Get-Random
            message = "Anomaly detected"
        }
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
        -ContentType "application/json" -Body $anomaly
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Anomaly sent"
    Start-Sleep -Seconds 3
}
```

**Expected Frontend Behavior:**
- ✅ WarningToast appears every 3 seconds
- ✅ AlertsPanel updates with new alerts
- ✅ Real-time WebSocket stream works

---

### TEST 7️⃣: Verify WebSocket Real-Time Connection
In a **new terminal**, run this to listen for live events:

```powershell
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource

$ws.ConnectAsync("ws://localhost:8080/ws", $cts.Token).Wait()
Write-Host "✓ Connected to WebSocket" -ForegroundColor Green

$buffer = New-Object byte[] 4096

while ($ws.State -eq "Open") {
    try {
        $result = $ws.ReceiveAsync($buffer, $cts.Token).Result
        if ($result.Count -gt 0) {
            $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            Write-Host "[WS] $message" -ForegroundColor Cyan
        }
    } catch { break }
}
$ws.Dispose()
```

**Expected Output:**
```
✓ Connected to WebSocket
[WS] {"type":"alert.created","severity":"MEDIUM",...}
[WS] {"type":"sos.triggered","severity":"HIGH",...}
[WS] {"type":"anomaly.detected",...}
```

---

## 📊 Data Flow Verification Checklist

### When you send **SOS** event:
- ✅ Backend receives at `POST /event`
- ✅ NATS publishes to `sos.triggered` subject
- ✅ SOS processor consumer receives it
- ✅ AlertEngine creates Level_3_Alert
- ✅ DB saves to PostgreSQL
- ✅ WebSocket broadcasts alert to frontend
- ✅ Frontend shows EmergencyAlertModal

### When you send **Fall** event:
- ✅ Backend receives at `POST /event`
- ✅ NATS publishes to `fall.detected` subject
- ✅ Fall processor consumer receives it
- ✅ AlertEngine initiates escalation (30s timer)
- ✅ Alert state transitions: FALL_DETECTED → LEVEL_1 → LEVEL_2 → LEVEL_3
- ✅ Each state change broadcasts via WebSocket
- ✅ Frontend shows WarningToast upgrading to Modal

### When you send **Vitals** event:
- ✅ Backend receives at `POST /event`
- ✅ NATS publishes to `vitals.updated` subject
- ✅ Vitals processor stores in Redis (2-hour TTL)
- ✅ Background aggregator samples to PostgreSQL (every 5 minutes)
- ✅ WebSocket broadcasts `vitals.live` event
- ✅ Frontend updates dashboard cards

---

## 🔧 Troubleshooting

### Backend won't start
```powershell
# Check port 8080 is free
netstat -ano | findstr :8080

# If occupied, kill process
taskkill /PID <PID> /F

# Then restart
cd backend && go run cmd/main.go
```

### Frontend not loading at localhost:5173
```powershell
# Clear npm cache
cd frontend
npm cache clean --force
npm install
npm run dev
```

### WebSocket not connecting
1. **Browser Console (F12)**: Check for WebSocket errors
2. **Backend running?**: Verify `go run cmd/main.go` is active
3. **CORS enabled?**: It is in `cmd/main.go` (cors.Default())
4. **Port 8080?**: Confirm in browser DevTools Network tab

### Docker containers not starting
```powershell
# Check status
docker-compose ps

# View logs
docker logs backend-postgres-1  # Database
docker logs backend-nats-1      # Event bus
docker logs backend-redis-1     # Cache

# Force restart
docker-compose down
docker-compose up -d
```

### Events not showing on frontend
1. Open **DevTools (F12)** → **Network** → **WS** (WebSocket)
2. Send an event: `Invoke-RestMethod ...`
3. Watch for incoming messages in WebSocket tab
4. Check **Console** for JavaScript errors

---

## 📋 Event Type Summary

| Event Type | State | Severity | Auto-Escalate? | Frontend Response |
|-----------|-------|----------|----------------|-------------------|
| `sos.triggered` | LEVEL_3_ALERT | HIGH | ❌ (instant) | EmergencyAlertModal |
| `fall.detected` | FALL_DETECTED | HIGH | ✅ (30s steps) | WarningToast → Modal |
| `anomaly.detected` | WAITING_CONFIRMATION | MEDIUM | ❌ | WarningToast (8s) |
| `vitals.updated` | (none) | (none) | ❌ | Dashboard cards |

---

## 🎯 Key Testing Commands Reference

**One-Liner Health Check:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
```

**Quick SOS Test:**
```powershell
@{event_id="sos-1";type="sos.triggered";user_id="user-123";timestamp=(Get-Date -Format 'o');payload=@{source="test"}} | ConvertTo-Json | % {Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST -ContentType "application/json" -Body $_}
```

**Stream 5 Quick Vitals:**
```powershell
1..5 | % {$hr=70+$_;@{event_id="v-$_";type="vitals.updated";user_id="user-123";timestamp=(Get-Date -Format 'o');payload=@{heart_rate=[float]$hr;spo2=96.0;steps=100;temperature=36.8;sleep_status=0}} | ConvertTo-Json | % {Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST -ContentType "application/json" -Body $_}; Start-Sleep -Milliseconds 500}
```

---

## 📖 For More Context

- **Project Vision**: See `backend/PROJECT_CONTEXT.md`
- **System Design**: See `backend/core.md`
- **API Docs**: See endpoints defined in `backend/internal/handlers/handler.go`
- **Alert State Machine**: See `backend/internal/services/alert_engine.go`

---

✅ **You're all set!** Start the backend & frontend, then run the tests above.
