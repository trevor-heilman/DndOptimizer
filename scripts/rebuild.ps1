<#
.SYNOPSIS
    Sync to WSL2, then rebuild and restart the DndOptimizer stack.

.DESCRIPTION
    Rsyncs the latest source from Windows to the Ubuntu-24.04 WSL2 filesystem,
    then runs rebuild.sh inside WSL2 where Podman reads from native ext4 —
    eliminating the 9P/virtio-fs mtime cache bug that caused stale builds.

      1. Rsync Windows source → WSL2 ~/projects/DndOptimizer
      2. Build backend image (and optionally frontend)
      3. Stop/remove old backend container
      4. Start new backend container
      5. Restart frontend (refreshes nginx upstream IP cache)
      6. Run Django migrations
      7. Reset admin password

.PARAMETER Frontend
    Also rebuild and recreate the frontend container.

.PARAMETER SkipPasswordReset
    Skip the admin password reset step.

.EXAMPLE
    .\scripts\rebuild.ps1
    .\scripts\rebuild.ps1 -Frontend
    .\scripts\rebuild.ps1 -SkipPasswordReset
#>

param(
    [switch]$Frontend,
    [switch]$SkipPasswordReset
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$WslUser    = $env:UbuntuUser
$WslProject = "/home/$WslUser/projects/DndOptimizer"

if (-not $WslUser) { throw "UbuntuUser environment variable is not set." }

# ── 1. Sync Windows source → WSL2 native filesystem ─────────────────────
Write-Host "`n[1] Syncing project to WSL2 ($WslProject)..." -ForegroundColor Cyan
$WindowsPath = "/mnt/c/Users/Trevo/Documents/Programming Projects/DndOptimizer/"
$rsyncCmd = "rsync -a --delete --exclude='.git/' --exclude='.venv/' --exclude='venv/' --exclude='node_modules/' --exclude='__pycache__/' --exclude='*.pyc' --exclude='htmlcov/' --exclude='dist/' --exclude='db.sqlite3' '$WindowsPath' '$WslProject/'"
wsl -d Ubuntu-24.04 -- bash -c $rsyncCmd
if ($LASTEXITCODE -ne 0) { throw "rsync failed." }
Write-Host "    Sync complete." -ForegroundColor Green

# ── 2. Delegate rebuild to WSL2 bash script ──────────────────────────────
Write-Host "`n[2] Running rebuild in WSL2..." -ForegroundColor Cyan

$bashArgs = ''
$bashArgs = @()
if ($Frontend)          { $bashArgs += '--frontend' }
if ($SkipPasswordReset) { $bashArgs += '--skip-password' }

# Pass the sudo password into WSL as WSL_SUDO_PASS so rebuild.sh can use
# `echo "$WSL_SUDO_PASS" | sudo -S <cmd>` for any elevation needed.
$env:WSL_SUDO_PASS = $env:UbuntuPW
wsl -d Ubuntu-24.04 -- bash "$WslProject/scripts/rebuild.sh" @bashArgs
if ($LASTEXITCODE -ne 0) { throw "rebuild.sh failed." }
