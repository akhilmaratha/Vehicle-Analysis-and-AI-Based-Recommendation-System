<#
.SYNOPSIS
  Start PostgreSQL (if needed), FastAPI, and Next.js for a local demo.

.DESCRIPTION
  Opens two new PowerShell windows:
    - Backend: uvicorn on http://localhost:8000
    - Frontend: Next.js on http://localhost:3000

  Does not reset the database. Does not print secrets.

.EXAMPLE
  .\scripts\start-local.ps1
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

function Test-PortOpen([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $async.AsyncWaitHandle.WaitOne(600)
        if (-not $wait) {
            $client.Close()
            return $false
        }
        $client.EndConnect($async)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

Write-Host "VehicleAI local demo startup" -ForegroundColor Cyan
Write-Host "Project root: $Root"

# --- PostgreSQL ---
Write-Host ""
Write-Host "1) PostgreSQL" -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -ne "Running") {
        Write-Host "   Starting Windows service: $($pgService.Name)"
        try {
            Start-Service $pgService.Name
        } catch {
            Write-Host "   Could not start service automatically. Start PostgreSQL manually, then re-run." -ForegroundColor Red
            throw
        }
    } else {
        Write-Host "   Service already running: $($pgService.Name)"
    }
} else {
    Write-Host "   No Windows postgresql* service found."
    Write-Host "   If Postgres runs another way (installer service with different name, Docker, etc.), start it yourself."
}

# --- Backend ---
Write-Host ""
Write-Host "2) FastAPI backend (port 8000)" -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $Backend "venv\Scripts\uvicorn.exe"))) {
    throw "Backend venv missing. From backend/: python -m venv venv && venv\Scripts\pip install -r requirements.txt"
}
if (-not (Test-Path (Join-Path $Backend ".env"))) {
    throw "Missing backend\.env — copy from backend\.env.example and fill values."
}
if (Test-PortOpen 8000) {
    Write-Host "   Port 8000 already in use — leaving existing backend running."
} else {
    $backendCmd = @"
Set-Location '$Backend'
Write-Host 'Backend: http://localhost:8000' -ForegroundColor Green
Write-Host 'Health:  http://localhost:8000/api/health'
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd | Out-Null
    Write-Host "   Started uvicorn in a new window."
}

# --- Frontend ---
Write-Host ""
Write-Host "3) Next.js frontend (port 3000)" -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $Frontend "package.json"))) {
    throw "frontend/package.json not found"
}
if (-not (Test-Path (Join-Path $Frontend ".env.local"))) {
    throw "Missing frontend\.env.local — copy from frontend\.env.local.example"
}
if (Test-PortOpen 3000) {
    Write-Host "   Port 3000 already in use — leaving existing frontend running."
} else {
    $frontendCmd = @"
Set-Location '$Frontend'
Write-Host 'Frontend: http://localhost:3000' -ForegroundColor Green
npm run dev -- --hostname localhost --port 3000
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd | Out-Null
    Write-Host "   Started Next.js in a new window."
}

Write-Host ""
Write-Host "Open http://localhost:3000 for the demo." -ForegroundColor Green
Write-Host "API health: http://localhost:8000/api/health"
Write-Host "Stop: close the two server windows, or stop the processes on ports 3000 and 8000."
Write-Host "Checklist: docs\LOCAL_DEMO.md"
