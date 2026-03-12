#!/usr/bin/env bash
# Start the Spellwright stack (all containers).
# Run from inside WSL2: bash ~/projects/DndOptimizer/scripts/start.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[1/2] Building images..."
podman-compose build

echo "[2/2] Starting containers (recreating frontend with new image)..."
# Remove the frontend container so podman-compose always deploys the freshly built image.
# (podman-compose up --build rebuilds the image but reuses the existing container,
#  leaving stale static files in place. Removing it forces a clean recreation.)
podman rm -f spellwright_frontend_1 2>/dev/null || true
podman-compose up -d

echo ""
echo "Stack is up."
echo "  App:   http://localhost/"
echo "  API:   http://localhost/api/"
echo "  Admin: http://127.0.0.1:8000/admin/"
