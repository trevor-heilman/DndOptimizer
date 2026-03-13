# Spellwright Progress — March 13, 2026

## Session Summary

Major feature session: introduced the full **Character & Spellbook system** (UI and backend), added **spine text colour customisation**, wired **contextual SpellDetail routing**, and implemented **dual-ruleset (2014 / 2024) prepared-spell calculations**.

---

## Features Implemented

### 1. Character & Spellbook System
Built the core organiser layer that lets users create named characters, attach coloured spellbooks, and browse prepared spells per character.

**Backend**
- `Character` model (`spellbooks/models.py`) — stores name, class, subclass, level, spellcasting modifier, ruleset; computes `max_prepared_spells` dynamically.
- `Spellbook` model — linked to Character; stores name, book colour, label colour, sort order.
- `PreparedSpell` model — join table linking spellbooks to spells with prepared/always-prepared state.
- `SpellbooksService` (`spellbooks/services.py`) — business logic layer for spellbook CRUD and spell management.
- New URL routes (`spellbooks/urls.py`) and DRF viewsets (`spellbooks/views.py`).
- Migrations `0006` – `0009`: Character table, book colour field, white-colour option, sort order + label colour.

**Frontend**
- `SpellbooksPage.tsx` — bookshelf view listing all characters and their spellbooks as spine cards.
- `SpellbookDetailPage.tsx` — per-spellbook detail with prepared-spell list, edit mode, and spell analysis entry point.
- `CharacterSpellsPage.tsx` — per-character aggregate view showing all spells across all spellbooks grouped by slot level; now includes an ✎ Edit button wired to `CreateCharacterModal`.
- `CreateCharacterModal.tsx` — create/edit modal for characters; drives the derived prepared-spell count display in real time.
- `CreateSpellbookModal.tsx` — lightweight modal for creating or renaming a spellbook.
- `SpellbookCard.tsx` — visual spine card; spine text colour driven by `label_color` field.
- `BookColorPicker.tsx` — reusable swatch picker for book-cover colour selection.
- `useCharacters.ts` / `characters.ts` — TanStack Query hooks and Axios service for character endpoints.
- `useSpellbooks.ts` / `spellbooks.ts` — hooks and service for spellbook endpoints.
- `spellSlots.ts` / `bookColors.ts` — constant tables for slot arrays and colour palette definitions.
- `App.tsx` — registered new routes: `/spellbooks`, `/spellbooks/:id`, `/characters/:id`.
- `types/api.ts` — `Character`, `CharacterCreate`, `Spellbook`, `PreparedSpell` interfaces.

---

### 2. Spine Text Colour Customisation
- Added `label_color` CharField to the `Spellbook` model (migration `0009`).
- `SpellbookDetailPage.tsx` exposes a swatch picker when editing the spellbook; includes White, Amber, Teal, Indigo, and **Red (#ef4444)** options.
- `SpellbookCard.tsx` applies `label_color` (falling back to the palette default) to both spine title spans.

---

### 3. Contextual SpellDetail Routing
- `SpellbookDetailPage.tsx` now passes `{ spellbookId, spellbookName, saveDC, atkBonus }` as React Router `state` when navigating to a spell's detail page via a prepared-spell row.
- `SpellDetailPage.tsx` reads `useLocation().state`; when navigated from a spellbook:
  - Back button shows **"← Back to [Spellbook Name]"** instead of a generic link.
  - `saveDC` and `atkBonus` are pre-filled into the analysis context form.

---

### 4. Dual-Ruleset Prepared-Spell Calculations (2014 vs 2024)
**Motivation**: D&D 5e 2024 changes the Wizard prepared-spell formula from *level + Int modifier* to a fixed per-level table; Paladin uses full class level instead of half; Bard and Ranger become preparation-based classes.

**Backend**
- `RULESET_CHOICES = [('2014', 'D&D 5e 2014'), ('2024', 'D&D 5e 2024')]` added to `models.py`.
- `WIZARD_2024_PREPARED` lookup dict (levels 1–20) added from the 2024 PHB table.
- `ruleset` CharField (default `'2014'`) added to `Character`.
- `max_prepared_spells` property updated with full branching:
  | Class | 2014 | 2024 |
  |---|---|---|
  | Wizard | `mod + level` | fixed table |
  | Paladin | `mod + level // 2` | `mod + level` |
  | Bard | `None` (spontaneous) | `mod + level` |
  | Ranger | `None` (spontaneous) | `mod + level // 2` |
  | Cleric / Druid / Artificer | unchanged | unchanged |
  | Sorcerer / Warlock | `None` | `None` |
- Both `CharacterSerializer` and `CharacterCreateUpdateSerializer` expose `ruleset`.
- Migration `0010_add_character_ruleset.py` written manually (containers were offline during development).

**Frontend**
- `Character` and `CharacterCreate` TypeScript interfaces updated with `ruleset: '2014' | '2024'`.
- `CreateCharacterModal.tsx`:
  - `WIZARD_2024_PREPARED` lookup table mirrors backend.
  - `derivedPrepared` branches on selected ruleset.
  - Pre-fills `ruleset` when editing an existing character.
  - Submit payload includes `ruleset`.
  - UI: two-button Rules Edition toggle ("D&D 5e (2014)" / "D&D 5e (2024)") appears above the Spellcasting Stats section.

---

## Files Changed

### New files
| Path | Description |
|---|---|
| `backend/spellbooks/services.py` | Business logic for spellbook operations |
| `backend/spellbooks/migrations/0006_character.py` | Character table |
| `backend/spellbooks/migrations/0007_spellbook_character_color.py` | Book colour field |
| `backend/spellbooks/migrations/0008_add_white_book_color.py` | White colour option |
| `backend/spellbooks/migrations/0009_add_sort_order_label_color.py` | Sort order + label colour |
| `backend/spellbooks/migrations/0010_add_character_ruleset.py` | Ruleset field |
| `frontend/src/components/BookColorPicker.tsx` | Colour swatch picker component |
| `frontend/src/components/CreateCharacterModal.tsx` | Character create/edit modal |
| `frontend/src/constants/bookColors.ts` | Book colour palette constants |
| `frontend/src/constants/spellSlots.ts` | Spell slot tables |
| `frontend/src/hooks/useCharacters.ts` | TanStack Query hooks for characters |
| `frontend/src/pages/CharacterSpellsPage.tsx` | Per-character spell aggregate view |
| `frontend/src/services/characters.ts` | Axios service for character API |

### Modified files
| Path | Key Changes |
|---|---|
| `backend/spellbooks/models.py` | Character model, WIZARD_2024_PREPARED, ruleset field, max_prepared_spells |
| `backend/spellbooks/serializers.py` | ruleset field in both serializers |
| `backend/spellbooks/urls.py` | New routes wired |
| `backend/spellbooks/views.py` | New viewsets |
| `frontend/src/App.tsx` | New routes registered |
| `frontend/src/components/CreateSpellbookModal.tsx` | Spellbook create/edit modal |
| `frontend/src/components/SpellbookCard.tsx` | label_color applied to spine text |
| `frontend/src/hooks/useSpellbooks.ts` | Spellbook query hooks |
| `frontend/src/pages/SpellDetailPage.tsx` | Router state, contextual back link, pre-filled analysis |
| `frontend/src/pages/SpellbookDetailPage.tsx` | BookColorPicker, colour swatches (incl. Red), edit mode |
| `frontend/src/pages/SpellbooksPage.tsx` | Bookshelf layout |
| `frontend/src/services/spellbooks.ts` | Axios service for spellbook API |
| `frontend/src/types/api.ts` | Character, CharacterCreate, Spellbook, PreparedSpell types |

---

## Rebuild Output
```
[5b] Running Django migrations...
  Applying spellbooks.0010_add_character_ruleset... OK
[7] Building frontend image (no-cache)...
  ✓ 835 modules transformed.
  ✓ built in 38.84s
Rebuild complete.
  App:   http://localhost/
  Admin: http://127.0.0.1:8000/admin/
```

---

## Open Issues / Future Work
- Consider 2024 spell data import from Open5e (slug TBD; `fetch_open5e.py` currently uses `wotc-srd`).
- Add "2014" / "2024" edition badge to character shelf cards in `SpellbooksPage`.
- Spell library filter for edition source ("2014 PHB" vs "2024 PHB").
- Stale Redis cache edge case: `fix_upcast_components` management command should call `spell.save()` after deletion to bump `updated_at` and invalidate the cache key. (Container restart on 260312 cleared Redis — dormant but not fixed.)
