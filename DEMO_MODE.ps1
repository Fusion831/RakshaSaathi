# RakshaSaathi - Live Demo Script
# Continuously sends realistic healthcare data with random anomalies and falls
# Usage: powershell -File DEMO_MODE.ps1

param(
    [int]$Duration = 300,  # Run for 5 minutes by default
    [int]$Interval = 1000  # Send vitals every 1 second (in milliseconds)
)

$startTime = Get-Date
$endTime = $startTime.AddSeconds($Duration)
$vitalCount = 0
$anomalyCount = 0
$fallCount = 0
$sosCount = 0

# Baseline vitals for realistic simulation
$baseline = @{
    heart_rate = 72.0
    blood_oxygen = 97.0
    temperature = 36.8
    activity_level = 1.5
    acceleration = 0.1
}

# User IDs for variety
$users = @("user-123", "elder-001", "patient-42", "monitor-789")
$currentUser = $users[0]

function Get-RealisticVital {
    param([float]$baseline, [float]$variance = 5, [float]$minVal = 0)
    $noise = (Get-Random -Minimum (-$variance) -Maximum $variance)
    $value = $baseline + $noise
    return [Math]::Max($minVal, [float]$value)
}

function Send-VitalsEvent {
    param([string]$userId)
    
    $vitalCount++
    
    # Generate realistic vitals with slight variation
    $hr = Get-RealisticVital -baseline 72 -variance 8 -minVal 60
    $spo2 = Get-RealisticVital -baseline 97 -variance 2 -minVal 94
    $temp = Get-RealisticVital -baseline 36.8 -variance 0.5 -minVal 36.0
    $activity = Get-RealisticVital -baseline 1.5 -variance 2 -minVal 0
    $accel = Get-RealisticVital -baseline 0.1 -variance 0.2 -minVal 0
    $steps = Get-Random -Minimum 1000 -Maximum 5000
    
    $event = @{
        event_id = "vitals-$(Get-Random -Minimum 100000 -Maximum 999999)"
        type = "vitals.updated"
        user_id = $userId
        timestamp = (Get-Date -Format 'o')
        payload = @{
            heart_rate = [float][Math]::Round($hr, 1)
            blood_oxygen = [float][Math]::Round($spo2, 1)
            body_temperature = [float][Math]::Round($temp, 2)
            activity_level = [float][Math]::Round($activity, 2)
            acceleration = [float][Math]::Round($accel, 2)
            steps = $steps
            sleep_status = 0
        }
    }
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/event" `
            -Method POST -ContentType "application/json" `
            -Body ($event | ConvertTo-Json) -TimeoutSec 2 -ErrorAction SilentlyContinue
        
        Write-Host "[VITALS #$vitalCount] HR: $($event.payload.heart_rate) | SpO2: $($event.payload.blood_oxygen) | Temp: $($event.payload.body_temperature) | Steps: $steps | User: $userId" -ForegroundColor Green
    } catch {
        Write-Host "[VITALS] Failed to send - Backend might be offline" -ForegroundColor Red
    }
}

function Send-AnomalyEvent {
    param([string]$userId)
    
    $anomalyCount++
    $metrics = @("heart_rate", "blood_oxygen", "temperature", "activity_level", "acceleration")
    $severity = @("LOW", "MEDIUM", "HIGH")
    
    $metric = $metrics[(Get-Random -Minimum 0 -Maximum $metrics.Length)]
    $sev = $severity[(Get-Random -Minimum 0 -Maximum $severity.Length)]
    
    $event = @{
        event_id = "anomaly-$(Get-Random -Minimum 100000 -Maximum 999999)"
        type = "anomaly.detected"
        user_id = $userId
        timestamp = (Get-Date -Format 'o')
        payload = @{
            severity = $sev
            metric = $metric
            message = "Unusual $metric detected - automated alert triggered"
            anomaly_score = [float]([Math]::Round((Get-Random -Minimum 70 -Maximum 99)) / 100)
        }
    }
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/event" `
            -Method POST -ContentType "application/json" `
            -Body ($event | ConvertTo-Json) -TimeoutSec 2 -ErrorAction SilentlyContinue
        
        Write-Host "[ANOMALY #$anomalyCount] $metric ($sev) - User: $userId" -ForegroundColor Yellow
    } catch {
        Write-Host "[ANOMALY] Failed to send - Backend might be offline" -ForegroundColor Red
    }
}

function Send-FallEvent {
    param([string]$userId)
    
    $fallCount++
    $locations = @("Living Room", "Bedroom", "Bathroom", "Kitchen", "Hallway", "Stairs")
    $location = $locations[(Get-Random -Minimum 0 -Maximum $locations.Length)]
    
    $event = @{
        event_id = "fall-$(Get-Random -Minimum 100000 -Maximum 999999)"
        type = "fall.detected"
        user_id = $userId
        timestamp = (Get-Date -Format 'o')
        payload = @{
            confidence = [float]([Math]::Round((Get-Random -Minimum 85 -Maximum 99)) / 100)
            location = $location
            impact_severity = @("LOW", "MEDIUM", "HIGH")[(Get-Random -Minimum 0 -Maximum 3)]
        }
    }
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/event" `
            -Method POST -ContentType "application/json" `
            -Body ($event | ConvertTo-Json) -TimeoutSec 2 -ErrorAction SilentlyContinue
        
        Write-Host "[FALL #$fallCount] Confidence: $($event.payload.confidence) | Location: $location | User: $userId" -ForegroundColor Magenta
    } catch {
        Write-Host "[FALL] Failed to send - Backend might be offline" -ForegroundColor Red
    }
}

function Send-SOSEvent {
    param([string]$userId)
    
    $sosCount++
    
    $event = @{
        event_id = "sos-$(Get-Random -Minimum 100000 -Maximum 999999)"
        type = "sos.triggered"
        user_id = $userId
        timestamp = (Get-Date -Format 'o')
        payload = @{
            source = "emergency_button"
            reason = "User pressed emergency button"
        }
    }
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/event" `
            -Method POST -ContentType "application/json" `
            -Body ($event | ConvertTo-Json) -TimeoutSec 2 -ErrorAction SilentlyContinue
        
        Write-Host "[SOS #$sosCount] Emergency triggered - User: $userId" -ForegroundColor Red
    } catch {
        Write-Host "[SOS] Failed to send" -ForegroundColor Red
    }
}

# Display header
Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "RakshaSaathi - LIVE DEMO MODE" -ForegroundColor Cyan
Write-Host ("="*80) -ForegroundColor Cyan
Write-Host "Duration: $Duration seconds | Interval: $($Interval)ms" -ForegroundColor White
Write-Host "User: $currentUser" -ForegroundColor White
Write-Host "Status: Running... Press Ctrl+C to stop`n" -ForegroundColor Green

# Main loop
try {
    while ((Get-Date) -lt $endTime) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        # Send regular vitals
        Send-VitalsEvent -userId $currentUser
        
        # Randomly trigger anomaly (15% chance - less frequent)
        if ((Get-Random -Minimum 1 -Maximum 100) -lt 15) {
            Send-AnomalyEvent -userId $currentUser
        }
        
        # Randomly trigger fall (8% chance)
        if ((Get-Random -Minimum 1 -Maximum 100) -lt 8) {
            Send-FallEvent -userId $currentUser
        }
        
        # Randomly trigger SOS (8% chance - more frequent for demo)
        if ((Get-Random -Minimum 1 -Maximum 100) -lt 8) {
            Send-SOSEvent -userId $currentUser
        }
        
        # Status update every 30 sends
        if ($vitalCount % 30 -eq 0) {
            Write-Host "`n[STATUS] Time: $([Math]::Round($elapsed))s | Vitals: $vitalCount | Anomalies: $anomalyCount | Falls: $fallCount" -ForegroundColor Cyan
        }
        
        Start-Sleep -Milliseconds $Interval
    }
} catch {
    if ($_.Exception.Message -notlike "*OperationCanceledException*") {
        Write-Host "`n[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final summary
Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "DEMO COMPLETED" -ForegroundColor Cyan
Write-Host ("="*80) -ForegroundColor Cyan
Write-Host "Total Vitals Sent: $vitalCount" -ForegroundColor Green
Write-Host "Total Anomalies Sent: $anomalyCount" -ForegroundColor Yellow
Write-Host "Total Falls Sent: $fallCount" -ForegroundColor Magenta
Write-Host "Total SOS Alerts Sent: $sosCount" -ForegroundColor Red
Write-Host "Duration: $([Math]::Round(((Get-Date) - $startTime).TotalSeconds))s`n" -ForegroundColor White
