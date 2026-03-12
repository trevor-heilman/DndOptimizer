# DnDOptimizer Progress 260311

## Scope Completed Today

### 1. Bug Fix — DamageChart min bar missing
- **File**: `frontend/src/components/DamageChart.tsx`
- Added `<Bar dataKey="min" name="Minimum" fill="#4c1d95" radius={[4, 4, 0, 0]} />` as the first bar in the `ScalingBarChart` subcomponent.
- Previously only "Average" and "Max" bars were rendered; minimum was silently dropped.

### 2. Bug Fix — Redundant cantrip info on SpellDetailPage
- **File**: `frontend/src/pages/SpellDetailPage.tsx`
- Removed the static cantrip tier list (hardcoded "2 dice at level 5, 3 at 11, 4 at 17" text) and the `<CantripScalingChart>` component that was duplicating information already shown in the Scaling tab.
- Replaced with a concise single line: `"Scales at character levels 5, 11, and 17"`.
- Removed orphaned `import { CantripScalingChart }`.

### 3. Bug Fix — Analyze returning black screen
- **File**: `frontend/src/types/api.ts` and `frontend/src/pages/SpellDetailPage.tsx`
- Root cause: `SpellAnalysisApiResult.results` had a TypeScript field named `type` but the backend returns `spell_type`.
- Fixed field name in type definition and all usages in `SpellDetailPage.tsx`.

### 4. Bug Fix — Breakeven analysis showing no data
- **File**: `backend/analysis/services.py`
- Root cause: `_sweep_param` was building profile point dicts as `{param: val, ...}` (where `param` is the dynamic variable name, e.g. `"slot_level"`). The frontend expected `{value: val, ...}` (key is always `"value"`).
- Changed to `{'value': val, ...}`.

### 5. Bug Fix — Spellbook card showing 0 spells
- **File**: `backend/spellbooks/views.py`
- Root cause: `SpellbookListSerializer` uses `spell_count = IntegerField(read_only=True)` which requires an annotated queryset, but `get_queryset()` was not annotating.
- Added `from django.db.models import Count` and `.annotate(spell_count=Count('prepared_spells'))` to `get_queryset()`.

### 6. Bug Fix — Spell parsing extracting dice from upcast text  
- **File**: `backend/spells/services.py`
- Root cause: `SpellParsingService.parse_spell_data` built `full_text = description + higher_level` and extracted dice expressions from that combined string. The `higher_level` field of spells like Acid Arrow ("increases by 1d4 for each slot level above 2nd") produced spurious base damage components alongside the real ones.
- Fixed: `dice_expressions` and `damage_types` now extracted from `description` only. Attack/save/half-damage detection (which correctly uses the full description context) still uses `full_text`.

### 7. One-time DB cleanup — spurious upcast components
- **File**: `backend/spells/management/commands/fix_upcast_components.py` (new)
- Management command that removes `SpellDamageComponent` objects whose `dice_expression` matches an upcast-scaling pattern in the spell's `higher_level` text, but not in the base `description`.
- Supports `--dry-run` flag; skips `is_verified=True` components.
- Ran against live DB: **30 spells cleaned** (including Acid Arrow, Fireball, Burning Hands, Blight, Guiding Bolt, etc.). Second run confirmed 0 remaining.

### 8. Rebuild script fixes
- **File**: `scripts/rebuild.sh`
- Fixed admin password-reset lookup: changed `User.objects.get(email='admin@dndoptimizer.local')` → `User.objects.get(username='admin')`.
  - The actual admin record in the DB was seeded with `admin@example.com`, so the email lookup was failing with `User.DoesNotExist` on every rebuild.

### 9. Admin credentials corrected
- Discovered actual admin record: `username=admin`, `email=admin@example.com`.
- Password manually reset to `admin1234` via Django shell.

---

## Known Issues / Carry-Forward

### Acid Arrow — extra 1d4 still visible in UI
- **Status**: Not resolved. The backend DB cleanup ran and confirmed 0 spurious components remain for Acid Arrow in the database. The extra damage component is still being displayed in the frontend.
- **Hypothesis**: The analysis or detail endpoint may be re-generating components on-the-fly (not reading from DB), OR the Redis cache is serving a stale analysis result that was computed before the DB cleanup.
- **Next steps**:
  1. Verify the result source: does the Acid Arrow detail page show the spurious component from `SpellDamageComponent` (DB) or from the live analysis engine?
  2. Flush the Redis cache (`redis-cli FLUSHDB` or invalidate the specific spell key) and re-test.
  3. If the analysis engine is regenerating components at query time, the `services.py` fix may need to also apply to the analysis path, not just the import path.

---

## Deployment

- `.\scripts\rebuild.ps1 -Frontend` run successfully.
- Backend image: `fc779a044272` (cached — no Dockerfile change).
- Backend container: `52ea7a7caf99` (recreated, code live via volume mount).
- Frontend image: `844e6b8839e8` (fresh no-cache build).
- Frontend container: `48e08d357bd1` (force-removed and recreated).
- Admin password reset manually: `admin` / `admin1234`.
