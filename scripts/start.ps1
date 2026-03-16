<#
.SYNOPSIS
    Sync the project to WSL2 and start the Spellwright stack.

.DESCRIPTION
    Rsyncs the latest source from Windows to the Ubuntu-24.04 WSL2 filesystem,
    then brings up all services via podman-compose running natively in WSL2.
    This avoids the Podman 9P/virtio-fs mtime cache bug that caused stale builds.

.EXAMPLE
    .\scripts\start.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$WslUser    = $env:UbuntuUser
$WslProject = "/home/$WslUser/projects/DndOptimizer"

if (-not $WslUser) { throw "UbuntuUser environment variable is not set." }

# ── 1. Sync Windows source → WSL2 native filesystem ─────────────────────
Write-Host "`n[1/2] Syncing project to WSL2 ($WslProject)..." -ForegroundColor Cyan
$WindowsPath = "/mnt/c/Users/Trevo/Documents/Programming Projects/DndOptimizer/"
$rsyncCmd = "rsync -a --delete --exclude='.git/' --exclude='.venv/' --exclude='venv/' --exclude='node_modules/' --exclude='__pycache__/' --exclude='*.pyc' --exclude='htmlcov/' --exclude='dist/' --exclude='db.sqlite3' '$WindowsPath' '$WslProject/'"
wsl -d Ubuntu-24.04 -- bash -c $rsyncCmd
if ($LASTEXITCODE -ne 0) { throw "rsync failed." }
Write-Host "    Sync complete." -ForegroundColor Green

# ── 2. Start containers in WSL2 ──────────────────────────────────────────
Write-Host "`n[2/2] Starting containers in WSL2..." -ForegroundColor Cyan
wsl -d Ubuntu-24.04 -- bash "$WslProject/scripts/start.sh"
if ($LASTEXITCODE -ne 0) { throw "start.sh failed." }
