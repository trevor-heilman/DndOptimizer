#!/usr/bin/env bash
# Rebuild and restart the DndOptimizer stack from WSL2.
#
# Usage (called by rebuild.ps1 which passes UbuntuPW via WSL_SUDO_PASS):
#   bash scripts/rebuild.sh               # backend only
#   bash scripts/rebuild.sh --frontend    # backend + frontend
#   bash scripts/rebuild.sh --skip-password
#
# Sudo helper: if WSL_SUDO_PASS is set (sourced from $env:UbuntuPW in PS),
# any sudo call can be done with: echo "$WSL_SUDO_PASS" | sudo -S <cmd>
set -euo pipefail

FRONTEND=false
SKIP_PASSWORD=false

for arg in "$@"; do
  case $arg in
    --frontend|-f) FRONTEND=true ;;
    --skip-password) SKIP_PASSWORD=true ;;
  esac
done

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 1. Build backend image ─────────────────────────────────────────────────
echo "[1] Building backend image..."
podman build -t localhost/dndoptimizer_backend:latest ./backend

# ── 2. Stop and remove old backend container ──────────────────────────────
echo "[2] Removing old backend container..."
podman stop  dndoptimizer_backend_1  2>/dev/null || true
podman rm -f dndoptimizer_backend_1  2>/dev/null || true

# ── 3. Start new backend container via podman-compose ─────────────────────
echo "[3] Starting new backend container..."
podman-compose up -d backend

# ── 4. Restart frontend (refreshes nginx upstream IP cache) ───────────────
echo "[4] Restarting frontend container (nginx IP cache refresh)..."
if podman container exists dndoptimizer_frontend_1; then
  podman restart dndoptimizer_frontend_1
else
  echo "    Frontend container not found yet; continuing."
fi

# ── 5. Wait for backend then run migrations ─────────────────────────────
echo "[5] Waiting for backend to become healthy..."
for i in $(seq 1 15); do
  sleep 2
  STATUS=$(podman inspect --format '{{.State.Status}}' dndoptimizer_backend_1 2>/dev/null || echo "missing")
  echo "    attempt $i — $STATUS"
  [ "$STATUS" = "running" ] && break
done

if [ "$STATUS" != "running" ]; then
  echo "WARNING: Backend did not reach 'running'. Check: podman logs dndoptimizer_backend_1"
else
  echo "    Backend is running."
  sleep 3
  echo "[5b] Running Django migrations..."
  podman exec dndoptimizer_backend_1 python manage.py migrate
fi

# ── 6. Reset admin password ────────────────────────────────────────────────
if [ "$SKIP_PASSWORD" = false ]; then
  echo "[6] Resetting admin password..."
  podman exec dndoptimizer_backend_1 python manage.py shell -c \
    "from users.models import User; u=User.objects.get(email='admin@example.com'); u.set_password('admin1234'); u.save(); print('Password reset OK')" \
    || echo "  Password reset failed — superuser may not exist yet."
fi

# ── 7. (Optional) Rebuild frontend ────────────────────────────────────────
if [ "$FRONTEND" = true ]; then
  echo "[7] Building frontend image (no-cache)..."
  podman build --no-cache -t localhost/dndoptimizer_frontend:latest ./frontend

  echo "[7b] Recreating frontend container via compose..."
  # Use compose config for long-lived services to keep networking consistent.
  podman-compose up -d frontend
fi

echo ""
echo "Rebuild complete."
echo "  App:   http://localhost/"
echo "  Admin: http://127.0.0.1:8000/admin/"
