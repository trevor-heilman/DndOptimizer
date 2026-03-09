# DnDOptimizer — Progress Log: 2026-03-09

## Session Summary

Three infrastructure bug fixes followed by two feature additions.

---

## Bug Fixes

### 1. App Pages Loading as Infinite Spinner

**Symptom**: All pages in the browser would spin forever — nothing rendered.

**Root cause**: The frontend container had `-p [::1]:80:80` bound alongside `-p 0.0.0.0:80:80`. On Windows/WSL, `wslrelay.exe` accepts TCP connections on `[::1]:80` but cannot forward HTTP — it just hangs. The browser's Happy Eyeballs algorithm chose the IPv6 address (TCP succeeded), then the HTTP layer never responded.

**Fix**:
- Removed `[::1]:80:80` from the frontend container run command and `compose.yml`
- Container now only binds `-p 0.0.0.0:80:80`
- Windows hosts file already has `127.0.0.1 localhost` ensuring `http://localhost` resolves to IPv4

**Files changed**: `compose.yml`, `.github/copilot-instructions.md`, `README.md`

---

### 2. AddSpellPicker Showing Only 16–20 Spells

**Symptom**: When adding spells to a spellbook, the picker showed only ~16 spells instead of all 417.

**Root cause**: The `AddSpellPicker` component correctly requests `page_size=1000`, but DRF's built-in `PageNumberPagination` has `page_size_query_param = None` hardcoded and silently ignores the `PAGE_SIZE_QUERY_PARAM` Django setting. The request param was never honoured.

**Fix**: Added a `SpellPagination(PageNumberPagination)` subclass directly in `backend/spells/views.py` with explicit class attributes:

```python
class SpellPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
```

Set as `pagination_class` on `SpellViewSet`. Backend was rebuilt and verified: `total=417 in_page=50`.

**Files changed**: `backend/spells/views.py`

---

### 3. Login Failing After Backend Rebuild

**Symptom**: After rebuilding the backend container, all API calls returned 502 Bad Gateway.

**Root cause**: nginx resolves the upstream container name (`dndoptimizer_backend_1`) to an IP address **once at startup** and caches it. When the backend container was recreated, it received a new IP. nginx was still routing to the old IP.

**Fix**: `podman restart dndoptimizer_frontend_1` — nginx re-resolves the hostname on startup.

**Rule established**: After **any** backend container recreation, always:
1. `podman restart dndoptimizer_frontend_1` — refreshes nginx's upstream IP cache
2. Reset admin password — container rebuild clears it from the image

**Files changed**: `.github/copilot-instructions.md`, `README.md`, `/memories/repo/dndoptimizer-state.md`

---

## Features Added

### 4. Spellbook Level Count Breakdown

**What**: A compact row of pills in the spellbook detail page header showing how many spells are in the book at each spell level.

**Example display**:
```
Cantrips: 2   Level 1: 5   Level 2: 3   Level 3: 1
```

**Implementation**:
- Added `levelCounts` memo to `SpellbookDetailPage` computed from the unfiltered `preparedSpells` list (so counts always reflect the full book regardless of active filters)
- Rendered as a `flex-wrap` row of small pills beneath the total spell count / prepared count stat line

**Files changed**: `frontend/src/pages/SpellbookDetailPage.tsx`

---

### 5. Create Spell Modal — Classes, Casting Time/Range Dropdowns, and Components

**What**: Expanded the custom spell creation form with three new sections.

#### a) Casting Time — Dropdown
Replaced the free-text input with a `<select>` of 9 common options (`1 action`, `1 bonus action`, `1 reaction`, `1 minute`, `10 minutes`, `1 hour`, `8 hours`, `12 hours`, `24 hours`). Selecting `Other` reveals a free-text field.

#### b) Range — Dropdown
Replaced the free-text input with a `<select>` of 15 common options (`Self`, `Touch`, `5 feet` through `1 mile`, `Sight`, `Unlimited`, `Special`). Selecting `Other` reveals a free-text field.

#### c) Components (V / S / M)
Three checkboxes for Verbal, Somatic, and Material. When Material (M) is checked, an indented text field appears for the material component description (validated — required if M is checked).

#### d) Classes
Nine class checkboxes (Artificer, Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard). Any combination can be selected and is submitted as the `classes` JSON array.

**Backend changes** (requires image rebuild + migration):
- Added four new fields to `Spell` model: `components_v`, `components_s`, `components_m` (BooleanField), `material` (CharField max 500)
- Created migration `0004_spell_components.py`
- Updated `SpellListSerializer`, `SpellDetailSerializer`, and `SpellCreateUpdateSerializer` to include the new component fields
- Added `classes` and `tags` to `SpellCreateUpdateSerializer` (were missing — custom spell creation couldn't set them)

**Frontend changes**:
- `Spell` type in `frontend/src/types/api.ts` extended with `components_v?`, `components_s?`, `components_m?`, `material?`
- `CreateSpellModal.tsx` rewritten with new `SpellFormState` fields and full UI

**Files changed**:
- `backend/spells/models.py`
- `backend/spells/migrations/0004_spell_components.py`
- `backend/spells/serializers.py`
- `frontend/src/types/api.ts`
- `frontend/src/components/CreateSpellModal.tsx`

---

## Deployment Notes

After today's backend model changes, a full backend rebuild is required:

```powershell
podman build -t localhost/dndoptimizer_backend:latest ./backend
podman stop dndoptimizer_backend_1 ; podman rm dndoptimizer_backend_1
podman run -d --name dndoptimizer_backend_1 --env-file .env --network dndoptimizer_default -p 0.0.0.0:8000:8000 -e DJANGO_SETTINGS_MODULE=config.settings.development -e POSTGRES_HOST=db -e POSTGRES_PORT=5432 -e REDIS_URL=redis://redis:6379/0 localhost/dndoptimizer_backend:latest

# Post-rebuild steps (always required):
podman restart dndoptimizer_frontend_1
podman exec dndoptimizer_backend_1 python manage.py shell -c "from users.models import User; u=User.objects.get(email='admin@dndoptimizer.local'); u.set_password('admin1234'); u.save()"
```

The migration `0004_spell_components.py` will run automatically when the new container starts (Django's `migrate` is called in the entrypoint).

After the backend rebuild, also rebuild the frontend to pick up the updated `CreateSpellModal` and level count breakdown:

```powershell
podman build -t localhost/dndoptimizer_frontend:latest ./frontend
podman stop dndoptimizer_frontend_1 ; podman rm dndoptimizer_frontend_1
podman run -d --name dndoptimizer_frontend_1 --network dndoptimizer_default -p 0.0.0.0:80:80 localhost/dndoptimizer_frontend:latest
```

---

## File Change Summary

| File | Change |
|---|---|
| `compose.yml` | Remove `[::1]:80:80` IPv6 binding |
| `backend/spells/views.py` | Add `SpellPagination` class, set on `SpellViewSet` |
| `backend/spells/models.py` | Add `components_v`, `components_s`, `components_m`, `material` fields |
| `backend/spells/migrations/0004_spell_components.py` | New migration for component fields |
| `backend/spells/serializers.py` | Add component fields + `classes`/`tags` to all serializers |
| `frontend/src/types/api.ts` | Extend `Spell` type with component fields |
| `frontend/src/components/CreateSpellModal.tsx` | Add classes, casting time/range dropdowns, V/S/M components |
| `frontend/src/pages/SpellbookDetailPage.tsx` | Add level count breakdown pills to header |
| `.github/copilot-instructions.md` | Document nginx IP cache and post-rebuild steps |
| `README.md` | Correct access URLs, add nginx caching warning, update feature list |
