#!/usr/bin/env bash
# Rebuild and restart the Spellwright stack from WSL2.
#
# Usage (called by rebuild.ps1 which passes UbuntuPW via WSL_SUDO_PASS):
#   bash scripts/rebuild.sh               # backend only
#   bash scripts/rebuild.sh --frontend    # backend + frontend
#   bash scripts/rebuild.sh --reset-password  # force admin password reset (only
#                                              # needed after a full DB wipe)
#
# Password notes: the admin password lives in the PostgreSQL volume and is NOT
# affected by rebuilding the backend container. Do not reset it on normal rebuilds.
#
# Sudo helper: if WSL_SUDO_PASS is set (sourced from $env:UbuntuPW in PS),
# any sudo call can be done with: echo "$WSL_SUDO_PASS" | sudo -S <cmd>
set -euo pipefail

FRONTEND=false
SKIP_PASSWORD=true   # default: skip — password persists in the DB volume

for arg in "$@"; do
  case $arg in
    --frontend|-f)     FRONTEND=true ;;
    --skip-password)    SKIP_PASSWORD=true ;;   # kept for backward compat
    --reset-password)   SKIP_PASSWORD=false ;;  # opt-in: reset after full DB wipe
  esac
done

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 1. Build backend image ─────────────────────────────────────────────────
echo "[1] Building backend image..."
podman build -t localhost/spellwright_backend:latest ./backend

# ── 2. Stop and remove old backend container ──────────────────────────────
echo "[2] Removing old backend container..."
podman stop  spellwright_backend_1  2>/dev/null || true
podman rm -f spellwright_backend_1  2>/dev/null || true

# ── 3. Start new backend container via podman-compose ─────────────────────
echo "[3] Starting new backend container..."
podman-compose up -d backend

# ── 4. Restart frontend (refreshes nginx upstream IP cache) ───────────────
echo "[4] Restarting frontend container (nginx IP cache refresh)..."
if podman container exists spellwright_frontend_1; then
  podman restart spellwright_frontend_1
else
  echo "    Frontend container not found yet; continuing."
fi

# ── 5. Wait for backend then run migrations ─────────────────────────────
echo "[5] Waiting for backend to become healthy..."
for i in $(seq 1 15); do
  sleep 2
  STATUS=$(podman inspect --format '{{.State.Status}}' spellwright_backend_1 2>/dev/null || echo "missing")
  echo "    attempt $i — $STATUS"
  [ "$STATUS" = "running" ] && break
done

if [ "$STATUS" != "running" ]; then
  echo "WARNING: Backend did not reach 'running'. Check: podman logs spellwright_backend_1"
else
  echo "    Backend is running."
  sleep 3
  echo "[5b] Running Django migrations..."
  podman exec spellwright_backend_1 python manage.py migrate
fi

# ── 6. Reset admin password (opt-in only — use --reset-password flag) ────────
if [ "$SKIP_PASSWORD" = false ]; then
  echo "[6] Resetting admin password..."
  podman exec spellwright_backend_1 python manage.py shell -c \
    "from users.models import User; u=User.objects.get(username='admin'); u.set_password('admin1234'); u.save(); print('Password reset OK')" \
    || echo "  Password reset failed — superuser may not exist yet."
else
  echo "[6] Skipping password reset (DB volume persists — password unchanged)."
fi

# ── 7. (Optional) Rebuild frontend ────────────────────────────────────────
if [ "$FRONTEND" = true ]; then
  echo "[7] Building frontend image (no-cache)..."
  podman build -t localhost/spellwright_frontend:latest ./frontend

  echo "[7b] Recreating frontend container..."
  # Force-remove the old container so the new image is actually used.
  # podman-compose up silently falls back to the old container when the name
  # is already taken, so we must remove it explicitly first.
  podman stop  spellwright_frontend_1 2>/dev/null || true
  podman rm -f spellwright_frontend_1 2>/dev/null || true
  podman run -d \
    --name spellwright_frontend_1 \
    --network spellwright_default \
    -p 0.0.0.0:80:80 \
    localhost/spellwright_frontend:latest
fi

echo ""
echo "Rebuild complete."
echo "  App:   http://localhost/"
echo "  Admin: http://127.0.0.1:8000/admin/"
