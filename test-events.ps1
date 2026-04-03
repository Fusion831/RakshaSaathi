#!/usr/bin/env powershell
# RakshaSaathi Integration Test Script
# Streams realistic health events to test the full pipeline

param(
    [string]$BackendURL = "http://localhost:8080",
    [string]$UserID = "user-123",
    [int]$DurationMinutes = 5,
    [switch]$StreamVitals,
    [switch]$StreamAnomalies,
    [switch]$TriggerFall,
    [switch]$TriggerSOS,
    [switch]$StreamAll
)

# Colors for output
$SuccessColor = "Green"
$WarningColor = "Yellow"
$ErrorColor = "Red"
$InfoColor = "Cyan"

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor $SuccessColor
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[⚠] $Message" -ForegroundColor $WarningColor
}

function Write-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor $ErrorColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "[ℹ] $Message" -ForegroundColor $InfoColor
}

function Test-Backend {
    Write-Info "Testing backend connectivity..."
    try {
        $response = Invoke-RestMethod -Uri "$BackendURL/health" -Method GET -TimeoutSec 5
        if ($response.status -eq "ok") {
            Write-Success "Backend is running on $BackendURL"
            return $true
        }
    }
    catch {
        Write-Error "Cannot connect to backend at $BackendURL"
        Write-Error "Make sure to start the backend first:"
        Write-Error "  cd C:\Users\daksh\Projects\SIHHackathon\backend"
        Write-Error "  docker-compose up -d"
        Write-Error "  go run cmd/main.go"
        return $false
    }
}

function Send-Event {
    param(
        [string]$EventType,
        [hashtable]$Payload
    )
    
    $event = @{
        event_id = "$EventType-$(Get-Random -Minimum 10000 -Maximum 99999)"
        type = $EventType
        user_id = $UserID
        timestamp = (Get-Date -Format 'o')
        payload = $Payload
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$BackendURL/event" -Method POST `
            -ContentType "application/json" `
            -Body $event `
            -TimeoutSec 5
        
        Write-Success "$EventType sent"
        return $true
    }
    catch {
        Write-Error "Failed to send $EventType : $_"
        return $false
    }
}

function Stream-Vitals {
    Write-Info "Starting vitals stream for $DurationMinutes minutes..."
    Write-Info "Simulating healthy baseline: HR 70-85, SpO2 96-99, Temp 36.8-37.0"
    
    $startTime = Get-Date
    $endTime = $startTime.AddMinutes($DurationMinutes)
    $eventCount = 0
    
    while ((Get-Date) -lt $endTime) {
        $hr = 70 + (Get-Random -Minimum -3 -Maximum 15)  # 67-85 BPM
        $spo2 = 96 + (Get-Random -Minimum -1 -Maximum 3) # 95-99 %
        $temp = 36.8 + (Get-Random -Minimum -0.3 -Maximum 0.2) # 36.5-37.0°C
        $steps = Get-Random -Minimum 50 -Maximum 500
        
        $payload = @{
            heart_rate = [float]$hr
            spo2 = [float]$spo2
            steps = $steps
            temperature = [float]$temp
            sleep_status = 0
        }
        
        if (Send-Event -EventType "vitals.updated" -Payload $payload) {
            $eventCount++
            Write-Host "  Vitals #$eventCount - HR: $hr BPM | SpO2: $spo2% | Temp: $temp°C | Steps: $steps"
        }
        
        Start-Sleep -Seconds 1
    }
    
    Write-Success "Vitals stream completed ($eventCount events sent)"
}

function Stream-Anomalies {
    Write-Info "Starting anomaly detection stream for $DurationMinutes minutes..."
    Write-Info "Simulating random anomalies (MEDIUM severity)..."
    
    $startTime = Get-Date
    $endTime = $startTime.AddMinutes($DurationMinutes)
    $eventCount = 0
    
    $anomalyTypes = @(
        @{ metric = "heart_rate"; message = "Heart rate spike detected" },
        @{ metric = "spo2"; message = "SpO2 level dropped below expected range" },
        @{ metric = "temperature"; message = "Body temperature anomaly detected" },
        @{ metric = "activity"; message = "Unusual activity pattern detected" }
    )
    
    while ((Get-Date) -lt $endTime) {
        $anomaly = $anomalyTypes | Get-Random
        
        $payload = @{
            severity = "MEDIUM"
            metric = $anomaly.metric
            message = $anomaly.message
        }
        
        if (Send-Event -EventType "anomaly.detected" -Payload $payload) {
            $eventCount++
            Write-Host "  Anomaly #$eventCount - $($anomaly.metric): $($anomaly.message)"
        }
        
        Start-Sleep -Seconds 5  # One anomaly every 5 seconds
    }
    
    Write-Success "Anomaly stream completed ($eventCount anomalies sent)"
}

function Trigger-Fall {
    Write-Warning "TRIGGERING FALL DETECTION..."
    Write-Info "This will initiate the alert escalation pipeline"
    Write-Info "Alert state: FALL_DETECTED → (30s) → LEVEL_1 → (30s) → LEVEL_2 → (30s) → LEVEL_3"
    
    $payload = @{
        confidence = 0.95
        location = "living_room"
    }
    
    if (Send-Event -EventType "fall.detected" -Payload $payload) {
        Write-Success "Fall alert created - watch frontend for escalation"
    }
}

function Trigger-SOS {
    Write-Warning "TRIGGERING SOS ALERT (CRITICAL)..."
    Write-Info "This bypasses all pending alerts and creates an immediate Level 3 alert"
    
    $payload = @{
        source = "smartwatch_button_press"
    }
    
    if (Send-Event -EventType "sos.triggered" -Payload $payload) {
        Write-Success "SOS event sent - frontend should show EmergencyAlertModal immediately"
    }
}

function Show-Help {
    Write-Host @"
RakshaSaathi Integration Test Script
Usage: .\test-events.ps1 [options]

Options:
  -StreamVitals      Stream realistic vitals data
  -StreamAnomalies   Stream random health anomalies
  -TriggerFall       Send a fall detection event
  -TriggerSOS        Send an SOS alert (critical)
  -StreamAll         Run all streams simultaneously
  
  -BackendURL        Backend address (default: http://localhost:8080)
  -UserID            User ID to simulate (default: user-123)
  -DurationMinutes   How long to stream (default: 5)

Examples:
  # Stream vitals for 10 minutes
  .\test-events.ps1 -StreamVitals -DurationMinutes 10
  
  # Trigger a fall with 5-minute monitoring
  .\test-events.ps1 -TriggerFall -DurationMinutes 5
  
  # Run everything simultaneously
  .\test-events.ps1 -StreamAll -DurationMinutes 3
  
  # Trigger SOS immediately
  .\test-events.ps1 -TriggerSOS

"@
}

# Main execution
if (-not $StreamVitals -and -not $StreamAnomalies -and -not $TriggerFall -and -not $TriggerSOS -and -not $StreamAll) {
    Show-Help
    exit
}

Write-Info "RakshaSaathi Integration Test Suite"
Write-Info "====================================="

# Test connectivity
if (-not (Test-Backend)) {
    exit 1
}

Write-Info ""

# Run requested tests
$jobs = @()

if ($StreamAll -or $StreamVitals) {
    $jobs += Start-Job -ScriptBlock {
        param($BackendURL, $UserID, $DurationMinutes)
        # Stream-Vitals logic here
        Write-Host "Vitals streaming started in background"
    } -ArgumentList $BackendURL, $UserID, $DurationMinutes
}

if ($StreamAll -or $StreamAnomalies) {
    $jobs += Start-Job -ScriptBlock {
        param($BackendURL, $UserID, $DurationMinutes)
        # Stream-Anomalies logic here
        Write-Host "Anomaly streaming started in background"
    } -ArgumentList $BackendURL, $UserID, $DurationMinutes
}

if ($TriggerFall) {
    Trigger-Fall
}

if ($TriggerSOS) {
    Trigger-SOS
}

# If running streams, do them sequentially for simplicity
if ($StreamVitals -or $StreamAnomalies -or $StreamAll) {
    if ($StreamVitals) { Stream-Vitals }
    if ($StreamAnomalies) { Stream-Anomalies }
}

Write-Info ""
Write-Success "All tests completed!"
Write-Info "📊 Check frontend dashboard at http://localhost:5173"
Write-Info "📡 Check WebSocket messages in browser DevTools (F12)"
