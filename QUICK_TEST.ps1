#!/usr/bin/env powershell
# RakshaSaathi Quick Test Script - Working Implementation
# Copy and paste commands directly from this file

# ============================================================================
# STEP 1: START BACKEND (Run in Terminal 1)
# ============================================================================

<# 
TERMINAL 1 - Backend Startup:

cd C:\Users\daksh\Projects\SIHHackathon\backend
docker-compose up -d
go run cmd/main.go

Expected Output:
  ✔ Container backend-redis-1    Running
  ✔ Container backend-postgres-1 Running
  ✔ Container backend-nats-1     Running
  Connected to NATS JetStream successfully
  Durable subscriber sos_processor created for subject sos.triggered
  Starting RakshaSaathi server on port 8080
  [GIN-debug] Listening and serving HTTP on :8080
#>

# ============================================================================
# STEP 2: START FRONTEND (Run in Terminal 2)
# ============================================================================

<#
TERMINAL 2 - Frontend Startup:

cd C:\Users\daksh\Projects\SIHHackathon\frontend
npm run dev

Expected Output:
  VITE v8.0.3  ready in 339 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

Then open browser to http://localhost:5173 and navigate to Family Dashboard
#>

# ============================================================================
# STEP 3: RUN TESTS (Terminal 3 - Copy paste these commands one by one)
# ============================================================================

# TEST 1: Health Check
Write-Host "TEST 1: Health Check" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET

# Result should be:
# status
# ------
# ok

# ============================================================================

# TEST 2: Send SOS Alert (Should immediately show alert on frontend)
Write-Host "`nTEST 2: SOS Alert" -ForegroundColor Cyan
$sosEvent = @{
    event_id = "sos-test-$(Get-Random -Minimum 1000 -Maximum 9999)"
    type = "sos.triggered"
    user_id = "user-123"
    timestamp = (Get-Date -Format 'o')
    payload = @{ source = "smartwatch" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" `
    -Body $sosEvent

Write-Host "✓ SOS event sent - check frontend for EmergencyAlertModal" -ForegroundColor Green

# ============================================================================

# TEST 3: Send Fall Detection (Should trigger escalation pipeline)
Write-Host "`nTEST 3: Fall Detection" -ForegroundColor Cyan
$fallEvent = @{
    event_id = "fall-test-$(Get-Random -Minimum 1000 -Maximum 9999)"
    type = "fall.detected"
    user_id = "user-123"
    timestamp = (Get-Date -Format 'o')
    payload = @{
        confidence = 0.95
        location = "living_room"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" `
    -Body $fallEvent

Write-Host "✓ Fall event sent - alert will escalate every 30 seconds" -ForegroundColor Green

# ============================================================================

# TEST 4: Send Anomaly Detection
Write-Host "`nTEST 4: Anomaly Detection" -ForegroundColor Cyan
$anomalyEvent = @{
    event_id = "anomaly-test-$(Get-Random -Minimum 1000 -Maximum 9999)"
    type = "anomaly.detected"
    user_id = "user-123"
    timestamp = (Get-Date -Format 'o')
    payload = @{
        severity = "MEDIUM"
        metric = "heart_rate"
        message = "Heart rate spike from 70 to 155 BPM"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
    -ContentType "application/json" `
    -Body $anomalyEvent

Write-Host "✓ Anomaly event sent - warning toast should appear on frontend" -ForegroundColor Green

# ============================================================================

# TEST 5: Stream Vitals (Run THIS in a separate loop)
Write-Host "`nTEST 5: Stream 20 Vitals Sequential" -ForegroundColor Cyan
Write-Host "Sending 20 vitals readings (1 per second)..." -ForegroundColor Yellow

for ($i = 1; $i -le 20; $i++) {
    $hr = 70 + (Get-Random -Minimum -5 -Maximum 10)
    $spo2 = 96 + (Get-Random -Minimum -1 -Maximum 2)
    $temp = 36.8 + (Get-Random -Minimum -0.2 -Maximum 0.3)
    
    $vitalsEvent = @{
        event_id = "vitals-$i-$(Get-Random -Minimum 1000 -Maximum 9999)"
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
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
            -ContentType "application/json" `
            -Body $vitalsEvent -TimeoutSec 3
        Write-Host "  [$i/20] HR: $hr | SpO2: $spo2 | Temp: $temp" -ForegroundColor Green
    } catch {
        Write-Host "  [$i/20] Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "✓ All 20 vitals sent - Dashboard should show updated metrics" -ForegroundColor Green

# ============================================================================

# TEST 6: Continuous Anomaly Stream (Run in separate Terminal)
Write-Host "`nTEST 6: Continuous Anomaly Stream (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "This will send an anomaly every 3 seconds indefinitely..." -ForegroundColor Yellow

<#
# Copy this into a new terminal and run it:

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
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/event" -Method POST `
            -ContentType "application/json" `
            -Body $anomaly -TimeoutSec 3
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Anomaly sent" -ForegroundColor Yellow
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 3
}
#>

# ============================================================================

# TEST 7: WebSocket Real-Time Verification
Write-Host "`nTEST 7: WebSocket Real-Time Connection" -ForegroundColor Cyan
Write-Host "Verify WebSocket is receiving live events..." -ForegroundColor Yellow

<#
# Run this in a new terminal to verify WebSocket:

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource

$ws.ConnectAsync("ws://localhost:8080/ws", $cts.Token).Wait()
Write-Host "✓ Connected to WebSocket at ws://localhost:8080/ws" -ForegroundColor Green

$buffer = New-Object byte[] 4096

Write-Host "Listening for events (press Ctrl+C to stop)..." -ForegroundColor Yellow

while ($ws.State -eq "Open") {
    try {
        $result = $ws.ReceiveAsync($buffer, $cts.Token).Result
        
        if ($result.Count -gt 0) {
            $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            $json = $message | ConvertFrom-Json
            Write-Host "[WS] Type: $($json.type) | Severity: $($json.severity) | State: $($json.current_state)" -ForegroundColor Cyan
        }
    } catch {
        break
    }
}

$ws.Dispose()
#>

# ============================================================================

# TROUBLESHOOTING COMMANDS
# ============================================================================

<#
# Check if backend is running
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET

# Check if frontend is running
Invoke-RestMethod -Uri "http://localhost:5173" -Method GET

# Get Docker container status
docker-compose ps

# View backend logs
docker logs backend-backend-1 -f

# View NATS logs
docker logs backend-nats-1 -f

# View Redis logs
docker logs backend-redis-1 -f

# View PostgreSQL logs
docker logs backend-postgres-1 -f

# Kill process on port 8080 (if needed)
netstat -ano | findstr :8080
taskkill /PID <PID> /F
#>

Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "All tests configured! Open browser to http://localhost:5173" -ForegroundColor Green
Write-Host "Check DevTools (F12) Network tab for WebSocket messages" -ForegroundColor Green
Write-Host "="*80 -ForegroundColor Cyan
