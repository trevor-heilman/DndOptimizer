#!/usr/bin/env bash
# Start the DndOptimizer stack (all containers).
# Run from inside WSL2: bash ~/projects/DndOptimizer/scripts/start.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "[1/1] Starting containers (rebuilding frontend image)..."
podman-compose up -d --build

echo ""
echo "Stack is up."
echo "  App:   http://localhost/"
echo "  API:   http://localhost/api/"
echo "  Admin: http://127.0.0.1:8000/admin/"
