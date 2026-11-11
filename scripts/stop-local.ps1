<#
.SYNOPSIS
  Stop local demo processes listening on ports 3000 and 8000.

.EXAMPLE
  .\scripts\stop-local.ps1
#>

$ErrorActionPreference = "Continue"

function Stop-PortListeners([int]$Port) {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host "Port $Port: nothing listening"
        return
    }
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            Write-Host "Port $Port: stopping PID $procId ($($proc.ProcessName))"
            Stop-Process -Id $procId -Force
        } catch {
            Write-Host "Port $Port: could not stop PID $procId"
        }
    }
}

Write-Host "Stopping local VehicleAI servers..." -ForegroundColor Cyan
Stop-PortListeners 3000
Stop-PortListeners 8000
Write-Host "Done. PostgreSQL was left running." -ForegroundColor Green
