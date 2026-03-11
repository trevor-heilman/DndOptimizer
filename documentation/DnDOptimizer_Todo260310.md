# DnDOptimizer - Today To-Do (2026-03-10)

## 1) Restore Runtime Verification

- [ ] Start Podman machine/connection and verify containers are reachable.
- [ ] Run smoke check: app at http://localhost/, API at http://localhost/api/, admin at http://127.0.0.1:8000/admin/.
- [ ] Capture container status with `podman compose ps` and logs for any unhealthy service.

## 2) Re-establish Test Baseline

- [ ] Run backend tests with coverage: `podman compose exec backend pytest --cov=. --cov-report=term-missing`.
- [ ] Run frontend tests: `cd frontend && npm run test:coverage`.
- [ ] Run frontend production build: `cd frontend && npm run build`.
- [ ] Record failures (if any) and create fix tickets before feature work.

## 3) Fix Documentation Drift (Highest Impact)

- [ ] Align deployment docs with current frontend runtime choice (nginx vs Caddy).
- [ ] Update API URL guidance so docs consistently prefer proxied `/api` where intended.
- [ ] Remove contradictory local networking statements that no longer match current config.

## 4) Normalize Admin Reset Workflow

- [ ] Pick one canonical admin email for local/dev (`admin@example.com` vs `admin@dndoptimizer.local`).
- [ ] Update `scripts/rebuild.sh` and docs to the same value.
- [ ] Verify rebuild script password reset succeeds on fresh container recreation.

## 5) Close Feature Gap: Break-even in Frontend

- [ ] Add API client method for `/api/analysis/breakeven/`.
- [ ] Add React hook for breakeven requests.
- [ ] Expose a basic breakeven UI (start on compare page) with AC and save crossover outputs.

## 6) Resolve JWT Blacklist Configuration Gap

- [ ] Decide whether refresh-token blacklisting is required in this release.
- [ ] If yes: add simplejwt blacklist app wiring and migration path.
- [ ] If no: disable blacklist-related settings to avoid misleading security assumptions.

## 7) Optional Cleanup (If Time Remains)

- [ ] Decide whether to keep `frontend/Caddyfile` as reference or remove it.
- [ ] Tighten compose/frontend environment notes to avoid confusion around build-time vs runtime env vars.
- [ ] Add a short "daily runbook" section in README for rebuild/test/smoke-check order.
