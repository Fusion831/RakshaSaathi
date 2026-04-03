# System Sanity Check - Interactive Verification
# This script tests each connection point in the system

param(
    [switch]$Quick,    # Just test essential connections
    [switch]$Full,     # Full diagnostic suite
    [switch]$Verbose   # Detailed output
)

if (-not $Quick -and -not $Full) {
    $Quick = $true  # Default to quick
}

$passed = 0
$failed = 0
$warnings = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body
    )
    
    Write-Host "`n[Testing] $Name" -ForegroundColor Cyan
    
    try {
        $params = @{
            Uri             = $Url
            Method          = $Method
            ContentType     = "application/json"
            TimeoutSec      = 3
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "[+] $Name`: SUCCESS" -ForegroundColor Green
        Write-Host "  Response: $($response | ConvertTo-Json -Depth 2 | Select-Object -First 3)" -ForegroundColor DarkGreen
        $script:passed++
        return $response
    } catch {
        Write-Host "[-] $Name`: FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkRed
        $script:failed++
        return $null
    }
}

function Test-Connection {
    param(
        [string]$Name,
        [string]$HostName,
        [int]$Port
    )
    
    Write-Host "`n[Checking] $Name ($HostName`:$Port)" -ForegroundColor Yellow
    
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($HostName, $Port).Wait(1000)
        
        if ($tcp.Connected) {
            Write-Host "[+] $Name`: Connected" -ForegroundColor Green
            $tcp.Close()
            $script:passed++
            return $true
        } else {
            Write-Host "[-] $Name`: No response" -ForegroundColor Red
            $script:failed++
            return $false
        }
    } catch {
        Write-Host "[-] $Name`: Connection failed" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkRed
        $script:failed++
        return $false
    }
}

function Show-Header {
    param([string]$Title)
    Write-Host "`n" + ("="*70) -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("="*70) -ForegroundColor Cyan
}

# ============================================================================
# TESTS START HERE
# ============================================================================

Show-Header "System Sanity Check - Module Connection Verification"

# Test 1: Backend Running
Show-Header "1. BACKEND CONNECTIVITY"
Test-Connection "Backend (HTTP)" "localhost" 8080
Test-Endpoint "Backend Health Check" "http://localhost:8080/health"

# Test 2: NATS
Show-Header "2. NATS JETSTREAM CONNECTIVITY"
Test-Connection "NATS Server" "localhost" 4222

# Test 3: PostgreSQL
Show-Header "3. DATABASE CONNECTIVITY"
Test-Connection "PostgreSQL" "localhost" 5432

# Test 4: Redis
Show-Header "4. REDIS CONNECTIVITY"
Test-Connection "Redis" "localhost" 6379

# Test 5: ML Service (Optional)
Show-Header "5. ML SERVICE CONNECTIVITY (Optional)"
$mlConnected = Test-Connection "ML Service (FastAPI)" "localhost" 8000

# Test 6: Event Publishing → NATS
if ($Full) {
    Show-Header "6. EVENT PIPELINE - FALL DETECTION"
    
    $fallEvent = @{
        event_id   = "test-fall-$(Get-Random)"
        type       = "fall.detected"
        user_id    = "user-123"
        timestamp  = (Get-Date).ToUniversalTime().ToString("o")
        payload    = @{
            confidence = 0.95
            location   = "Living Room"
        }
    }
    
    Write-Host "`n[Publishing] Fall Event to Backend" -ForegroundColor Cyan
    Write-Host "Event: $($fallEvent | ConvertTo-Json)" -ForegroundColor DarkGray
    
    Test-Endpoint "POST /event (Fall Detection)" `
        "http://localhost:8080/event" `
        "POST" `
        $fallEvent
    
    Start-Sleep -Milliseconds 500
    
    Show-Header "7. EVENT PIPELINE - ANOMALY DETECTION"
    
    $anomalyEvent = @{
        event_id   = "test-anomaly-$(Get-Random)"
        type       = "anomaly.detected"
        user_id    = "user-123"
        timestamp  = (Get-Date).ToUniversalTime().ToString("o")
        payload    = @{
            severity = "MEDIUM"
            metric   = "heart_rate"
            message  = "Spike detected"
        }
    }
    
    Write-Host "`n[Publishing] Anomaly Event to Backend" -ForegroundColor Cyan
    Write-Host "Event: $($anomalyEvent | ConvertTo-Json)" -ForegroundColor DarkGray
    
    Test-Endpoint "POST /event (Anomaly Detection)" `
        "http://localhost:8080/event" `
        "POST" `
        $anomalyEvent
    
    Start-Sleep -Milliseconds 500
    
    Show-Header "8. EVENT PIPELINE - VITALS UPDATE"
    
    $vitalsEvent = @{
        event_id   = "test-vitals-$(Get-Random)"
        type       = "vitals.updated"
        user_id    = "user-123"
        timestamp  = (Get-Date).ToUniversalTime().ToString("o")
        payload    = @{
            heart_rate        = 78.5
            blood_oxygen      = 98.2
            body_temperature  = 36.8
            activity_level    = 2.1
            acceleration      = 0.15
            sleep_status      = 0
        }
    }
    
    Write-Host "`n[Publishing] Vitals Event to Backend" -ForegroundColor Cyan
    Write-Host "Event: $($vitalsEvent | ConvertTo-Json)" -ForegroundColor DarkGray
    
    Test-Endpoint "POST /event (Vitals Update)" `
        "http://localhost:8080/event" `
        "POST" `
        $vitalsEvent
    
    Start-Sleep -Milliseconds 500
    
    Show-Header "9. EVENT PIPELINE - SOS ALERT"
    
    $sosEvent = @{
        event_id   = "test-sos-$(Get-Random)"
        type       = "sos.triggered"
        user_id    = "user-123"
        timestamp  = (Get-Date).ToUniversalTime().ToString("o")
        payload    = @{
            source = "manual"
            reason = "Emergency button pressed"
        }
    }
    
    Write-Host "`n[Publishing] SOS Event to Backend" -ForegroundColor Cyan
    Write-Host "Event: $($sosEvent | ConvertTo-Json)" -ForegroundColor DarkGray
    
    Test-Endpoint "POST /event (SOS Triggered)" `
        "http://localhost:8080/event" `
        "POST" `
        $sosEvent
}

# Test 7: WebSocket Connection (Optional - requires frontend)
if ($Full) {
    Show-Header "10. WEBSOCKET CONNECTIVITY"
    
    Write-Host "`n[Note] WebSocket test requires browser" -ForegroundColor Yellow
    Write-Host "Open browser console and run:" -ForegroundColor Yellow
    Write-Host '
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => console.log("Connected!");
    ws.onmessage = (e) => console.log("Message:", JSON.parse(e.data));
    ' -ForegroundColor DarkYellow
}

# Summary
Show-Header "SUMMARY"

Write-Host "`nTests Passed: $passed" -ForegroundColor Green
Write-Host "Tests Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings: $warnings" -ForegroundColor Yellow

if ($failed -eq 0) {
    Write-Host "`n[+] All essential services are connected!" -ForegroundColor Green
    Write-Host "Ready to start testing the event pipeline." -ForegroundColor Green
} else {
    Write-Host "`n[-] Some services are not responding." -ForegroundColor Red
    Write-Host "Check the errors above and verify services are running:" -ForegroundColor Red
    Write-Host "  1. Docker: docker-compose up -d" -ForegroundColor Yellow
    Write-Host "  2. Backend: go run ./cmd/main.go" -ForegroundColor Yellow
    Write-Host "  3. Frontend: npm run dev" -ForegroundColor Yellow
}

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
