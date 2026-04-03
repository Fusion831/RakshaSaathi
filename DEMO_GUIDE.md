# 🎬 RakshaSaathi - Live Demo Guide

## Overview

RakshaSaathi now includes a comprehensive **Live Demo Mode** that streams realistic healthcare data with random anomalies and fall detections. Perfect for showcasing the system in action!

---

## Getting Started

### 1. Start Backend Services
```bash
cd backend
docker-compose up -d
go run cmd/main.go
```

**Wait for:**
```
Connected to NATS JetStream successfully
Durable subscriber sos_processor created
[GIN-debug] Listening and serving HTTP on :8080
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

**Wait for:**
```
VITE v8.0.3 ready in 339 ms
➜ Local: http://localhost:5173/
```

### 3. Open Dashboard
Navigate to **http://localhost:5173** in your browser

---

## Demo Mode Features

### Demo Button
Located in the top-right of the dashboard header:
- **Blue Button (Start):** Click to begin live demo
- **Red Button (Stop):** Click to stop demo

### Live Demo Script (PowerShell)

Run this in a **new terminal** for real-time data streaming:

```bash
cd C:\Users\daksh\Projects\SIHHackathon
powershell -File DEMO_MODE.ps1 -Duration 300
```

**Parameters:**
- `-Duration 300` : Run for 5 minutes (default)
- `-Interval 1000` : Send data every 1 second (in milliseconds)

**Example: Run for 10 minutes, faster updates:**
```bash
powershell -File DEMO_MODE.ps1 -Duration 600 -Interval 500
```

### Demo Mode Sends:
1. **Vitals Every Second**
   - Heart Rate: 60-90 BPM (realistic variation)
   - SpO2: 94-99%
   - Temperature: 36-38°C
   - Activity Level & Acceleration

2. **Random Anomalies** (30% chance every 10 seconds)
   - Severity: LOW, MEDIUM, HIGH
   - Metrics: heart_rate, blood_oxygen, temperature, activity_level, acceleration
   - Yellow warning toasts appear (8-second auto-dismiss)

3. **Random Falls** (5% chance every 10 seconds)
   - Locations: Living Room, Bedroom, Bathroom, Kitchen, Hallway, Stairs
   - Confidence: 85-99%
   - Escalates LEVEL_1 → LEVEL_2 → LEVEL_3 over 90 seconds
   - Red emergency modal appears

---

## Interactive Features

### View Alert History
Click **"View History"** button in header to open side panel showing:
- All alerts for the user
- Type: Fall, Anomaly, SOS
- Severity level
- Current state (Active/Resolved)
- Timestamp
- Red/Yellow/Green color coding

### Acknowledge Alerts
When an alert modal appears:
1. Click **"Acknowledge"** button to resolve alert
2. Modal closes immediately
3. Alert marked as RESOLVED in database

### Real-Time Dashboard Updates
- **SummaryCards:** Heart Rate, SpO2, Temperature, Activity update in real-time
- **VitalsSnapshot:** Latest readings display instantly
- **AlertsPanel:** New anomalies/falls appear immediately
- **WebSocket:** All updates via real-time WebSocket connection (sub-100ms latency)

---

## Demo Scenario Examples

### Quick Demo (3 minutes, showcasing all features)
**Terminal 1:**
```bash
powershell -File DEMO_MODE.ps1 -Duration 180
```

**Watch for:**
- Vitals updating every second on dashboard
- Warning toasts appearing randomly
- Emergency modals for falls
- Alert history panel showing all events

### Showcase Escalation (5 minutes, focus on fall escalation)
**Terminal 1:**
```bash
powershell -File DEMO_MODE.ps1 -Duration 300 -Interval 800
```

**Steps:**
1. Start demo
2. Trigger fall manually: Click browser simulator button
3. Watch escalation: LEVEL_1 → LEVEL_2 → LEVEL_3 (wait ~90 seconds)
4. Click "Acknowledge" to stop escalation

### High-Frequency Data Stream (stress test configuration)
**Terminal 1:**
```bash
powershell -File DEMO_MODE.ps1 -Duration 120 -Interval 200
```

**Focuses on:**
- System performance under high data load
- Real-time update latency
- WebSocket stability
- UI rendering responsiveness

---

## Demo Output Console

The PowerShell script shows real-time status:
```
================================================================================
RakshaSaathi - LIVE DEMO MODE
================================================================================
Duration: 300 seconds | Interval: 1000ms
User: user-123
Status: Running... Press Ctrl+C to stop

[VITALS #1] HR: 75.2 | SpO2: 97.5 | Temp: 36.82 | User: user-123
[VITALS #2] HR: 73.8 | SpO2: 97.3 | Temp: 36.80 | User: user-123
[ANOMALY #1] heart_rate (MEDIUM) - User: user-123
[VITALS #3] HR: 76.1 | SpO2: 96.9 | Temp: 36.85 | User: user-123
[FALL #1] Confidence: 0.92 | Location: Bathroom | User: user-123
[VITALS #4] HR: 82.3 | SpO2: 96.5 | Temp: 36.88 | User: user-123

[STATUS] Time: 30s | Vitals: 30 | Anomalies: 2 | Falls: 1
```

---

## Manual Testing (Without Script)

If you prefer to send events manually via PowerShell:

### Send Vitals
```powershell
@{
    event_id="vitals-1"
    type="vitals.updated"
    user_id="user-123"
    timestamp=(Get-Date -Format 'o')
    payload=@{
        heart_rate=78.5
        blood_oxygen=97.2
        body_temperature=36.8
        activity_level=1.5
        acceleration=0.1
        sleep_status=0
    }
} | ConvertTo-Json | % {
    Invoke-RestMethod -Uri "http://localhost:8080/event" `
        -Method POST -ContentType "application/json" -Body $_
}
```

### Send Anomaly
```powershell
@{
    event_id="anom-1"
    type="anomaly.detected"
    user_id="user-123"
    timestamp=(Get-Date -Format 'o')
    payload=@{
        severity="MEDIUM"
        metric="heart_rate"
        message="Heart rate spike detected"
    }
} | ConvertTo-Json | % {
    Invoke-RestMethod -Uri "http://localhost:8080/event" `
        -Method POST -ContentType "application/json" -Body $_
}
```

### Send Fall
```powershell
@{
    event_id="fall-1"
    type="fall.detected"
    user_id="user-123"
    timestamp=(Get-Date -Format 'o')
    payload=@{
        confidence=0.95
        location="Living Room"
        impact_severity="HIGH"
    }
} | ConvertTo-Json | % {
    Invoke-RestMethod -Uri "http://localhost:8080/event" `
        -Method POST -ContentType "application/json" -Body $_
}
```

---

## Backend Features Demonstrated

### Event Processing Pipeline
```
REST Endpoint (/event)
    ↓
JSON Deserialization
    ↓
NATS JetStream Publication
    ↓
4 Durable Consumers (fall, vitals, anomaly, sos)
    ↓
Alert Engine Service
    ↓
PostgreSQL (history) + Redis (hot state)
    ↓
WebSocket Broadcast
    ↓
Frontend Real-Time Update
```

### Database State Tracking
- **PostgreSQL:** All alerts stored with timestamps
- **Redis:** Current alert states with 1-hour TTL
- **Idempotency:** Events deduped within 24 hours via Redis keys
- **Escalation:** Configurable 30-second intervals (LEVEL_1 → LEVEL_2 → LEVEL_3)

---

## What Gets Recorded

### PostgreSQL (Alert History)
- Alert ID, User ID, Event ID
- Type (FALL_DETECTED, ANOMALY_DETECTED, SOS_TRIGGERED)
- Severity (LOW, MEDIUM, HIGH, CRITICAL)
- State at each escalation step
- Full context/payload
- Timestamps for each state change

### Redis (Hot State)
- Current alert state
- TTL-based auto-expiration
- Processed event dedup keys
- Active alert lists per user

### WebSocket (Real-Time)
- Vitals updates: `vitals.live` events
- Alert escalation: `alert.escalated` events
- SOS triggers: `sos.triggered` events
- All delivered sub-100ms latency

---

## Troubleshooting

### Demo Script Not Sending Events
**Problem:** Backend not responding  
**Solution:**
```bash
curl http://localhost:8080/health
# Should return: {"status": "ok"}
```

### Events Sent But No Frontend Updates
**Problem:** WebSocket not connected  
**Solution:**
1. Open browser DevTools (F12)
2. Go to **Network** tab → **WS** (WebSocket)
3. Look for `ws://localhost:8080/ws`
4. Should show "Connected" status
5. Check **Console** for JavaScript errors

### Alert History Not Loading
**Problem:** Backend endpoint issue  
**Solution:**
```bash
curl http://localhost:8080/alerts/user/user-123
# Should return JSON with alerts array
```

### High CPU Usage
**Problem:** Too frequent updates beating browser  
**Solution:**
- Increase `-Interval` to 1500 or 2000ms
- Limit demo duration with `-Duration 120`

---

## Architecture Summary

```
RakshaSaathi Demo System:

Frontend (React + Vite)
  ├─ DemoButton → Start/Stop UI
  ├─ AlertHistory → Side panel with all alerts
  ├─ WebSocket Hook → Real-time updates
  └─ Live Dashboard → Updates every WebSocket message

Backend (Go + Gin)
  ├─ Handler: /event → Accept events
  ├─ Handler: /alerts/user/{id} → History lookup
  ├─ Handler: ws://localhost:8080/ws → WebSocket broadcaster
  ├─ AlertEngine → State machine + escalation
  └─ Services → PostgreSQL + Redis persistence

Demo Script (PowerShell)
  └─ DEMO_MODE.ps1 → Generates realistic data every 1 second
```

---

## Advanced Usage

### Multiple Users
Edit DEMO_MODE.ps1 and modify:
```powershell
$users = @("user-123", "elder-001", "patient-42", "monitor-789")
```

### Custom Anomaly Frequency
Change in DEMO_MODE.ps1:
```powershell
# Currently: 30% chance every 10 seconds
if ((Get-Random -Minimum 1 -Maximum 100) -lt 30) {
    # Change 30 to your desired percentage (1-100)
}
```

### Custom Fall Frequency
Change in DEMO_MODE.ps1:
```powershell
# Currently: 5% chance every 10 seconds
if ((Get-Random -Minimum 1 -Maximum 100) -lt 5) {
    # Change 5 to your desired percentage (1-100)
}
```

---

## Performance Metrics

### Expected Performance (reference numbers)
- **Vitals Ingestion:** < 10ms
- **Anomaly Detection:** < 50ms (async, inline)
- **WebSocket Broadcast:** < 5ms
- **End-to-End:** < 100ms (vitals to frontend display)
- **Alert Escalation:** Exactly 30 seconds between levels
- **System Throughput:** 100+ events/second capacity

---

## Next Steps

After the demo:
1. **Review Database**: Query PostgreSQL for all alerts
2. **Analyze History**: Check alert patterns in Alert History panel
3. **Performance Testing**: Run with higher `-Interval` and monitor CPU
4. **Integration Testing**: Send events from external systems to /event endpoint

---

✅ **Demo Ready!** Run `powershell -File DEMO_MODE.ps1` and start the frontend to see RakshaSaathi in action!
