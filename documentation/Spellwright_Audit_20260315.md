# Spellwright — Project & Test Audit
**Date:** 2026-03-15  
**Last updated:** 2026-03-15 — F13 error/loading/empty states complete (368 backend, 340 frontend)  
**Status:** Living document — update each session

---

## 1. Project Overview

A D&D 5e spell optimization platform: browse the PHB 2014/XGtE/TCoE/PHB 2024 spell catalog, build character spellbooks, analyze expected DPR for any spell/slot/context combination, compare spells, track spell slots and combat performance, and visualize scaling and efficiency.

**Stack:** Django 5 + DRF backend · React 18 + TypeScript + Vite frontend · PostgreSQL 16 · Redis 7 · Podman containers  
**Latest commit:** `23f450c` — Priority 1 test build-out  
**Previous feature commit:** `e4e642e` — char-level breakpoints UI, summoning compare panel, efficiency guard

---

## 2. Backend Apps Inventory

### analysis/
- **Models:** `AnalysisContext`, `SpellComparison`
- **Engine:** `DiceCalculator`, `AttackRollCalculator`, `SavingThrowCalculator`, `SpellAnalysisService`
  - Branches: attack roll, saving throw, auto-hit (Magic Missile), summon (best-template DPR), cantrip scaling
  - Features: upcast scaling, character-level breakpoints, crit types, lucky feat, elemental adept, advantage/disadvantage, resistance
- **Endpoints:** `/api/analysis/analyze/`, `/compare/`, `/efficiency/`, `/breakeven/`, `/compare_growth/`, `/contexts/`

### core/
- Shared: caching decorators, custom exceptions, pagination, permissions, throttles (login 5/hr, register 3/hr, analysis 60/hr)

### spellbooks/
- **Models:** `Character`, `Spellbook`, `PreparedSpell`
- **Character:** `char_level`, `spell_slots_used` (JSONField), `prepared_spells_bonus` (migration 0011), `ruleset` ('2014'/'2024'), `school_copy_discounts`, `subclass` (wizard school choices → auto-discount via `_SCHOOL_SUBCLASS_MAP`)
- **Service:** `calculate_copy_cost()` (wizard copy rules: 50gp × lvl, 2hr × lvl; scribes 50% off all; school-specialist 50% off school's spells via `_SCHOOL_SUBCLASS_MAP`)
- **Endpoints:** Characters (CRUD + slot update/reset + all_spells), Spellbooks (CRUD + add/remove spell + export + duplicate + reorder + copy_cost)
- **Migrations:** 0001–0011 applied; migration 0011 adds `prepared_spells_bonus`

### spells/
- **Models:** `Spell`, `DamageComponent`, `SpellParsingMetadata`, `SummonTemplate`, `SummonAttack`
- **Key fields on Spell:** `char_level_breakpoints` (JSONField, migration 0015), `upcast_scale_step` (migration 0014), `condition_label` on DamageComponent (migration 0013), `is_auto_hit` (migration 0006), `tags`, `classes`, `components_v/s/m`, `material`, `upcast_scale_step`, `half_damage_on_miss`
- **Services:** `DamageExtractionService` (regex-based parsing), `SpellParsingService`
- **Endpoints:** Spell CRUD + import/export/duplicate/bulk_delete, `DamageComponentViewSet`, source list
- **Management commands:** `seed_spells` (deduplicates on name+source), `import_phb2024_spells`, `classify_phb_editions`, `fix_upcast_components`, `fix_spell_data`, `check_upcast`, `backfill_spell_classes`
- **Migrations:** 0001–0015 applied; latest adds `char_level_breakpoints` JSONField

### users/
- **Model:** `User` (UUID PK, email-unique, custom AbstractUser)
- **Auth:** JWT (access + refresh), register, login, change_password, `/me/`, token refresh

---

## 3. Frontend Inventory

### Pages (10)
| Page | Route | Key Features |
|------|-------|-------------|
| HomePage | `/` | Dashboard, recent spells/books, stats |
| LoginPage | `/login` | JWT login form |
| RegisterPage | `/register` | Account creation |
| SpellsPage | `/spells` | Browse/search/filter/import/create; sort by level/name/school/best-efficiency; "not in spellbook" filter |
| SpellDetailPage | `/spells/:id` | Full details, embedded DPR analysis, summon creature cards with DPR, char-level scaling display |
| SpellbooksPage | `/spellbooks` | Character shelf, create character/spellbooks |
| SpellbookDetailPage | `/spellbooks/:id` | Manage spells, slot tracker, ⚡ Cast button, hit/miss combat log, compare panel (damage + summoning), spell slot pips, copy costs |
| ComparePage | `/compare` | Side-by-side comparison, 3D growth chart, growth table, summary stats |
| AdminReviewPage | `/admin/review` | Staff QA |
| CharacterSpellsPage | `/characters/:id/spells` | All available spells for character |

### Components (18+)
**Modals:** `CreateCharacterModal`, `CreateSpellbookModal`, `CreateSpellModal` (900+ LOC, all form sections incl. char-level breakpoints + condition labels), `ImportSpellsModal`, `AddSpellPicker` (with source filter), `ClearSpellsModal`  
**Charts:** `DamageChart` (showCrit prop), `EfficiencyChart`, `DamageComparisonChart`, `CantripScalingChart`, `GrowthChart3D` (lazy), `HitChanceHeatmap` (lazy)  
**Core:** `Layout`, `ProtectedRoute`, `AnalysisContextForm`, `SpellCard` (source badge, class pills), `SpellbookCard`, `BookColorPicker`, `MultiSelect`  
**UI:** `ModalShell` (max-h-[90vh] overflow fix), `LoadingSpinner`

### Hooks (6)
`useAnalysis` (analyze, compare, efficiency, breakeven, growth, batch), `useSpells` (list, sources, CRUD, import, bulk), `useSpellbooks` (CRUD, add/remove, cost, duplicate, reorder), `useCharacters` (CRUD, slot management, character-spells)

### Services (6)
`api.ts`, `auth.ts`, `spells.ts`, `spellbooks.ts`, `analysis.ts`, `characters.ts`

### Constants / Types
`spellSlots.ts` — complete slot tables for all classes + warlock pact magic  
`spellColors.ts` — school colors, SPELL_TAGS list, timing labels  
`api.ts` (types) — `Spell`, `Character`, `Spellbook`, `AnalysisContext`, `SpellAnalysisApiResult`, `MathBreakdown` (with summon fields), `SummonPerTemplateResult`

---

## 4. Backend Test Coverage

**Current:** 337 tests · ~93% coverage  
**Config:** `pytest.ini`, `DJANGO_SETTINGS_MODULE = config.settings.test`, threshold 80%

| File | Classes | Tests | What it covers |
|------|---------|-------|----------------|
| `test_api.py` | 5 | 18 | API root, auth, dice/attack/save calculators, rate limiting, spell model endpoints |
| `test_analysis_services.py` | 8 | 66 | Dice/attack/save calcs, spell analysis (attack/save/upcast/auto-hit), breakeven, char-level breakpoints, `_normalize_raw()` PascalCase mapping (B7), `_infer_tags()` all branches (B7) |
| `test_models.py` | 7 | 31 | User, Spell, DamageComponent, SpellParsingMetadata, Spellbook, AnalysisContext, Character.max_prepared_spells (7 subclass + bonus edge cases) |
| `test_summon_analysis.py` | 4 | 28 | Summon branch: 0 attacks, extreme slot, multiple templates, best-template selection, missing template graceful fail |
| `test_compare_growth.py` | 4 | 26 | Compare growth (cantrip/leveled), view integration, context/comparison ViewSets |
| `test_api_integration.py` | 7 | 39 | Auth, spell CRUD, spellbook ops, analysis endpoints, caching, permissions, import |
| `test_spell_actions.py` | 6 | 25 | Spell duplicate/bulk_delete/export, admin, damage component filter, auth |
| `test_edge_case_spells.py` | 8 | 35 | Acid Arrow (2-component, crit-ineligible DoT, half-miss), Magic Missile (auto-hit, per-attack upcast), Scorching Ray (multi-beam), Summoning (no-template graceful fail) |
| `test_spellbooks.py` | ~8 | 45 | Spellbook CRUD, add/remove spell, copy_cost, slot tracking, character ops |
| `test_management_commands.py` | ~8 | 43 | seed_spells, classify_phb_editions, fix_upcast_components, backfill_spell_classes, check_upcast |

### Not covered (gaps remaining)
- `upcast_scale_step = 0` (not validated; would cause division by zero in engine)
- `DamageComponent` edge cases: 0 dice, negative flat modifier, invalid timing (B4)
- `char_level_breakpoints` round-trip via import/export (B5)

---

## 5. Frontend Unit Test Coverage

**Current:** 295 tests → **340 tests** · 24 test files (Priority 2 + B7/F11/F12/F13 complete)  

| File | Component | Tests | Status |
|------|-----------|-------|--------|
| `ProtectedRoute.test.tsx` | ProtectedRoute | 3 | ✅ Meaningful |
| `SpellCard.test.tsx` | SpellCard | 11 | ✅ Good (name, level, school, badges, links, damage) |
| `AnalysisContextForm.test.tsx` | AnalysisContextForm | 5 | ✅ Meaningful |
| `useAnalysis.test.tsx` | useAnalysis | 5 | ✅ State + fetch mock |
| `useSpells.test.tsx` | useSpells | 6 | ✅ List/filter mock |
| `LoginPage.test.tsx` | LoginPage | 6 | ✅ Form, invalid creds, redirect |
| `RegisterPage.test.tsx` | RegisterPage | 8 | ✅ Basic rendering + form fields |
| `HomePage.test.tsx` | HomePage | 7 | ✅ Heading, stat cards, links |
| `CharacterSpellsPage.test.tsx` | CharacterSpellsPage | 8 | ⚠️ Minimal — page load + heading |
| `SpellsPage.test.tsx` | SpellsPage | 8 | ⚠️ Minimal — page load, spell list render |
| `SpellDetailPage.test.tsx` | SpellDetailPage | 44 | ✅ Full: loading/error, header badges, description, mechanics, damage components, upcast table, char-level breakpoints, combat params, analysis results, summon DPR |
| `SpellbooksPage.test.tsx` | SpellbooksPage | 28 | ✅ Full: page structure, loading/error/empty state, character shelf, unassigned shelf, modals open/close |
| `SpellbookDetailPage.test.tsx` | SpellbookDetailPage | 8 | ⚠️ Minimal — loading state, empty spellbook |
| `ComparePage.test.tsx` | ComparePage | 32 | ✅ Full: structure, combobox selection, comparison/growth/breakeven results, error state |
| `CreateSpellModal.test.tsx` | CreateSpellModal | 31 | ✅ Full: render guard, create mode, validation (5 rules), conditional sections (component rows, class checkboxes, char-level breakpoints), edit mode pre-fill, submission payload, pending/error/success states |
| `DamageChart.test.tsx` | DamageChart | 14 | ✅ Empty state, leveled slot pills (slots 3–9), stat pills (Min/Avg/Crit Avg/Max/Crit Max), showCrit toggle, onSlotChange callback, cantrip mode render, fallback mode |
| `EfficiencyChart.test.tsx` | EfficiencyChart | 11 | ✅ Empty state, chart title, best-slot footer (slot + value), multi-point render, reversed-order best-slot detection |
| `SpellbookDetailPage.test.tsx` (expanded) | SpellbookDetailPage | 12 | ✅ + F13: "Spellbook Not Found" exact title, Back to Spellbooks button, empty spellbook "No Spells Yet" heading, "Add Your First Spell" button |
| `CharacterSpellsPage.test.tsx` (expanded) | CharacterSpellsPage | 11 | ✅ + F13: spells error alert, empty state "No spells found across any tomes", spell count stat |
| `AdminReviewPage.test.tsx` | AdminReviewPage | 13 | ✅ New (F13): loading text, error heading + description + Retry button + refetch call, empty "All clear!", spell count plural/singular, review card per spell, Mark as Reviewed button |

### Not covered / needs expansion
- **SpellbookDetailPage** — cast button behavior, slot tracking, hit/miss overlay, combat log panel
- **SpellsPage** — search/filter, pagination, efficiency sort, "not in spellbook" filter
- **Other modal components** — `ImportSpellsModal`, `ClearSpellsModal`
- **Remaining chart components** — `GrowthChart3D`, `HitChanceHeatmap`, `CantripScalingChart`
- **Hooks** — `useCharacters`, `useSpellbooks` not tested

---

## 6. E2E Test Coverage

**Current:** 8 spec files · ~65 tests  
**Config:** `playwright.config.ts` — baseURL `http://localhost`, workers: 1 (sequential), retries: 2 CI, auth setup shares session  
**Added:** commit `054a664` (2026-03-15) — original 5 specs + E2E infrastructure; Priority 1 session — `spellbook-creation.spec.ts` + expanded `compare.spec.ts`  
**Note:** ❌ E2E not in CI pipeline — must run locally against running stack

| Spec | Tests | What it covers |
|------|-------|----------------|
| `auth.setup.ts` | ~3 | Login + save session state for use by all other specs |
| `auth.spec.ts` | ~5 | Login form, invalid creds, unauthenticated redirect, register link |
| `spells.spec.ts` | ~5 | Spell library page load, search by name, click → detail |
| `spellbooks.spec.ts` | ~4 | Spellbooks page load, empty state, New Character / Bind New Tome buttons presence, spellbook link navigation |
| `compare.spec.ts` | ~13 | Compare page heading, search inputs, Analyze button disabled/re-disable, **full flow: select 2 spells → Analyze → Comparison Results + Expected Damage + Efficiency + Breakeven Analysis + Spell Growth Analysis sections** |
| `spellbook-creation.spec.ts` | ~10 | Create character → create spellbook → add spells → verify shelf card |

### Not covered (E2E gaps)
- **Character creation flow** — click New Character → fill form → submit → verify card on shelf
- **Spellbook creation + add spells** — Bind New Tome → add book → add spells → verify count
- **Spell detail + DPR analysis** — click spell → open detail → fill form → Analyze → verify expected damage
- **Spellbook detail + compare panel** — add spells → open Compare → run → verify chart renders
- **Spell import workflow** — import JSON file → verify count updates
- **Spell create/edit** — create custom spell → including CharLevelScaling section
- **Cast button + slot tracking** — ⚡ Cast → slot decrements → disabled when empty
- **Hit/miss tracking** — open combat log → record hits/misses → verify MAP estimate
- **Error scenarios** — network failure handling, invalid form submission, empty search result
- **Mobile breakpoints** — key flows at 375px viewport
- ❌ **E2E job in CI** — GitHub Actions Playwright job not configured

---

## 7. Test Build-Out Plan

### Priority 1 — Critical (highest regression risk)

| ID | Type | Target | What to test | Effort | Status |
|:--:|------|--------|-------------|--------|--------|
| B1 | Backend | `test_summon_analysis.py` | Summon branch: 0 attacks, extreme slot, multiple templates, best-template selection | Medium | ✅ 28 tests |
| B2 | Backend | `test_models.py` (extend) | `Character.max_prepared_spells` — 2024 subclasses, edge level, bonus prepared field | Small | ✅ 14 tests |
| B3 | Backend | `test_analysis_services.py` (extend) | `char_level_breakpoints`: valid save, attack, auto-hit; malformed JSON rejected | Small | ✅ 12 tests |
| F1 | Frontend unit | `ComparePage.test.tsx` | Spell selection, chart render, growth table, summary stats | Medium | ✅ 32 tests |
| F2 | Frontend unit | `SpellDetailPage.test.tsx` | Summon DPR results, char-level scaling display, efficiency hidden for non-scaling | Medium | ✅ 44 tests — full coverage incl. summon DPR results, cantrip breakpoints, analysis results, efficiency gating |
| F3 | Frontend unit | `SpellbooksPage.test.tsx` | Shelf render, character card, spellbook card, empty state | Medium | ✅ 28 tests — page structure, loading/error/empty, shelf stats, unassigned shelf, modal open/close |
| F4 | Frontend unit | `CreateSpellModal.test.tsx` | All form sections incl. char-level scaling: add/remove tier, validation, submit payload | Medium | ✅ 31 tests — render guard, validation (5 rules), conditional sections, edit mode, submission, pending/error/success states |
| E1 | E2E | `spellbook-creation.spec.ts` | Create character → create spellbook → add spells → verify shelf | Large | ✅ 10 tests |
| E2 | E2E | `compare.spec.ts` (expand) | Full flow spec exists — already tests select 2 spells → Analyze → results. Expand: 3D chart, growth table, summary stats | Small | ✅ ~13 tests — expected damage, efficiency, breakeven, growth analysis, clear-selection flow |

**Subtotal: ~65 new tests (minus ~22 already in minimal files)**

---

### Priority 2 — Important

| ID | Type | Target | What to test | Effort | Status |
|:--:|------|--------|-------------|--------|--------|
| B4 | Backend | `test_models.py` (extend) | `DamageComponent` edge: 0 dice, negative flat, invalid timing | Small | ✅ Done — +8 edge-case tests |
| B5 | Backend | `test_spell_actions.py` (extend) | `char_level_breakpoints` round-trip: create → export → import → compare fields | Small | ✅ Done — +4 round-trip tests |
| F5 | Frontend unit | `AddSpellPicker.test.tsx` | Search, multi-select, source filter, submit | Medium | ✅ Done — 17 tests; added aria-labels for level/tag "All" pills |
| F6 | Frontend unit | `CreateCharacterModal.test.tsx` | Class, level, ruleset, prepared bonus, submit | Small | ✅ Done — 18 tests; added id/htmlFor for accessibility |
| F7 | Frontend unit | `useSpellbooks.test.tsx` | Create/update/delete hook state, error | Small | ✅ Done — 7 tests; fixed MSW handler URL `/api/spellbooks/` |
| F8 | Frontend unit | `useCharacters.test.tsx` | Hook state + error handling | Small | ✅ Done — 9 tests |
| F9 | Frontend unit | `SpellsPage.test.tsx` (expand) | Search filter, pagination, efficiency sort, "not in spellbook" filter | Medium | ✅ Done — 18 tests |
| F10 | Frontend unit | `SpellCard.test.tsx` (extend) | Source badge, class pills, all timing labels | Small | ✅ Done — 27 tests |
| E3 | E2E | `spell-import.spec.ts` | Import JSON file → verify spells appear + counts update | Medium | ✅ Done — 10 tests (modal UI, file upload, paste JSON flows) |
| E4 | E2E | `spell-detail-analysis.spec.ts` | Open spell detail → run Analyze → verify expected damage result | Medium | ✅ Done — 14 tests (Combat Parameters, Analysis Results, slot controls, advanced options) |

**Subtotal: ~56 new tests**

---

### Priority 3 — Nice-to-Have

| ID | Type | Target | What to test | Effort | Status |
|:--:|------|--------|-------------|--------|--------|
| B6 | Backend | `test_management_commands.py` (verify) | `seed_spells`, `classify_phb_editions`, `fix_upcast_components` — **largely done** | ✅ Done | 43 tests |
| B7 | Backend | `test_analysis_services.py` (extend) | `SpellParsingService._normalize_raw()` all field mappings + `_infer_tags()` all branches | Small | ✅ Done — +8 normalize_raw + 11 infer_tags tests |
| F11 | Frontend unit | `DamageChart.test.tsx` | Renders bars, slot selector changes data | Small | ✅ Done — 14 tests |
| F12 | Frontend unit | `EfficiencyChart.test.tsx` | Renders line chart, handles empty data | Small | ✅ Done — 11 tests |
| F13 | Frontend unit | Error/loading states | All pages: loading spinner, error alert, empty state | Medium | ✅ Done — SpellbookDetailPage (+4), CharacterSpellsPage (+3), AdminReviewPage (new, 13 tests) |
| E5 | E2E | `mobile.spec.ts` | Key flows on 375px viewport (auth, spells list, spellbook page) | Medium | ✅ Done — 19 tests (unauthenticated auth flows, layout nav-hidden check, spell library, spellbooks, compare; horizontal overflow assertions) |
| E6 | E2E | `error-scenarios.spec.ts` | Network timeout handling, empty search result, invalid form submission | Medium | ✅ Done — 6 tests (spells API failure, spellbooks API failure, empty search empty-state, invalid login, register mismatched passwords, register short password) |
| E7 | E2E | Add E2E job to CI | Configure GitHub Actions to run Playwright against deployed stack | Large | ⏳ Not started |

**Subtotal: ~42 new tests**

---

## 8. Implementation Sequence

```
Phase 1 (next session) — Backend critical + E2E expansion
  B1 · B2 · B3 · E1 · expand E2

Phase 2 — Frontend pages (expand minimal → meaningful)
  F1 · F2 · F3 · F4

Phase 3 — Frontend components + more E2E
  F5 · F6 · F7 · F8 · F9 · F10 · E3 · E4

Phase 4 — Polish + CI
  B4–B7 · F11–F13 · E5–E7
```

**Notes on current phase status:**
- **Priority 1 complete** — all 9 items (B1/B2/B3/F1/F2/F3/F4/E1/E2) ✅ done; 337 backend tests, 226 frontend unit tests, ~40 E2E tests
- B6 (management commands) was ✅ complete before this session — 43 tests already written
- **Priority 2 complete** — all 8 items (B4/B5/F5/F6/F7/F8/F9/F10) ✅ done; **349 backend tests, 295 frontend unit tests** as of this session
- **E3/E4 complete** — `spell-import.spec.ts` (10 tests) + `spell-detail-analysis.spec.ts` (14 tests) added
- **Priority 3 small items complete** — B7/F11/F12 ✅ done; **368 backend tests, 320 frontend unit tests**
- **F13 complete** — error/loading/empty states: SpellbookDetailPage (+4), CharacterSpellsPage (+3), AdminReviewPage (new, 13) → **340 frontend unit tests**
- **E5 complete** — `mobile.spec.ts` added: 19 tests covering 375px viewport (auth, layout, spells, spellbooks, compare, overflow checks)
- **E6 complete** — `error-scenarios.spec.ts` added: 6 tests (API failure alerts via `page.route()`, empty-search empty-state, login/register form validation errors)
- Next up: E7 (CI job)

---

## 9. Coverage Targets

| Area | Current | Target |
|------|---------|--------|
| Backend | 349 tests · ~92% | 350+ tests · 95%+ |
| Frontend unit | 295 tests · ~85% (estimated) | 300+ tests · 85%+ |
| E2E | 5 specs · ~22 tests | 12 specs · 50+ tests |
| CI pipeline | Backend CI only; no E2E job | E2E job in GitHub Actions |

---

## 10. Key Features — Complete Inventory (as of 2026-03-15)

This section documents every major implemented feature so future sessions know exactly what exists.

### Spell Library (SpellsPage)
- Browse/search/filter spells by name, level, school, class, source, concentration, ritual, tags
- Sort by level, name, school, or **⚡ Best Efficiency at X Level** (batch analysis: sidebar selects slot level + AC + attack bonus + save DC + target save bonus; runs up to 500 spells at 5-way concurrency, shows ranked list with expected damage badge)
- **"Not in spellbook" filter** — `?not_in_spellbook=<uuid>` backend param + dropdown in sidebar
- Import spells via JSON, export, duplicate, bulk delete
- Source abbreviation badge on each card (PHB 2014, PHB 2024, XGtE, TCoE, SRD, etc.)
- Create / edit custom spells with full damage, upcast, auto-hit, tags, components, char-level breakpoints

### Spell Detail (SpellDetailPage)
- Full stat cards: school, level, casting time, range, duration, components (V/S/M + material text)
- Class pills linking to filtered spell library
- Damage components table + upcast scaling
- Condition labels displayed as blue badge on timing cell
- **Char-level scaling breakpoints** displayed in Spell Mechanics card
- Embedded DPR analysis (AnalysisContextForm → Analyze → DamageChart, CantripScalingChart, HitChanceHeatmap)
- Efficiency stat card + EfficiencyChart (hidden when spell has no slot-scaling data)
- **Summon DPR** — live creature cards with HP/AC/Atk/DPR; embedded Combat Parameters + ⚡ Analyze DPR button; DPR Results panel: best DPR / efficiency / hit % stat cards, ranked per-template table (★ winner), EfficiencyChart; best template highlighted with emerald border

### Spell Creation / Edit (CreateSpellModal)
- 900+ LOC modal with 9 logical sections:
  - Basic info (name, level, school, source combo-box, description)
  - Components (V/S/M checkboxes + material text)
  - Classes (checkbox group by class name)
  - Tags (SPELL_TAGS checkbox group + damage/summoning/aoe/etc.)
  - Spell Type (attack roll, saving throw, is_auto_hit, save type, half-damage flags)
  - Damage Components (per-component row: dice count, die size, flat, type, timing, condition label, can-crit checkbox)
  - Upcast Scaling (dice/slot, die size, base level, extra attacks/slot, **scale every N levels**)
  - **Character Level Scaling** — +Add Tier rows (threshold, bonus dice count, die size, flat); visible for all non-cantrip spells
  - Number of attacks, crit enabled
- Auto-closes on successful save; defaults school to Abjuration; source is datalist combo-box

### Spellbooks Library (SpellbooksPage)
- Character "shelf" with portrait-color accent; create character modal
- Each character shows their owned spellbooks as tome cards (book_color + label_color)
- Bind New Tome button + CreateSpellbookModal (with spine color + label color pickers)
- Drag-to-reorder spellbooks (planned but listed in earlier docs — verify if implemented)

### Spellbook Detail (SpellbookDetailPage)
- **Header row**: prepared count `★ N/max` (turns red when over limit), slot pips by level
- **SpellSlotsPanel** — clickable dots (used/available per level) + Reset button; wired to `useUpdateSpellSlots` / `useResetSpellSlots`
- **⚡ Cast button** on each leveled spell card — increments `spell_slots_used` via `updateSlots`; grayed/disabled when no slots remain; cantrips never show Cast
- **Hit/miss tracking** (attack-roll spells after Cast) — hit/miss overlay → stores `CombatRoll[]` in `localStorage` keyed by spellbook ID
- **🎯 Combat Log** panel — collapsible; hit rate, MAP AC estimate (Bayesian `inferAC` over discrete AC 5–30), 95% credible interval, roll history pills, Clear Log button
- **Compare Damage Spells** panel — slot level selector, color-coded bars:
  - Gold/purple bars for standard damage spells (filtered by `damage`/`summoning` tags or fallback to `damage_components`)
  - Teal bars for summoning spells; explanatory note distinguishes DPR from expected damage
  - Expandable **Summoning Template Breakdown** table with per-template DPR at current slot level
  - By Level view — teal lines for summoning spells
- **Copy Cost section** — compact inline row showing `X gp / Y hours`; `▾ breakdown` toggle expands per-spell table; applies subclass school discounts automatically (`_SCHOOL_SUBCLASS_MAP`)
- **AddSpellPicker** — search, multi-select, source filter, quick-add with school + source abbreviation badge

### Character System
- `Character` model: class, level, subclass (wizard school choices), portrait_color, spellcasting modifier, DC bonus, attack bonus extra, spell_slots_used, school_copy_discounts, prepared_spells_bonus, ruleset (2014/2024)
- `max_prepared_spells` computed property: uses INT modifier, class, level, ruleset — 2024 Wizard uses fixed lookup table; bonus from `prepared_spells_bonus`
- Character CRUD + slot update/reset + all_spells list endpoints

### Analysis Engine
- **Attack roll branch**: hit probability, crit probability, expected damage with advantage/disadvantage/lucky/halfling-lucky, crit types (double_dice/double_damage/max_plus_roll), multi-attack, half-on-miss
- **Saving throw branch**: save failure probability with advantage/disadvantage/penalty die (Bane/Mind Sliver/Synaptic Static levels), half-damage-on-save, evasion, resistance, number-of-targets
- **Auto-hit branch** (Magic Missile): guaranteed damage, per-attack upcast scaling
- **Summon branch**: for each `SummonTemplate` at `floor(slot_level/2)` attacks, runs AttackRollCalculator; returns best-template DPR + per-template breakdown
- **Cantrip scaling**: uses `char_level_breakpoints` to look up tier bonuses at character levels 5, 11, 17
- **Upcast scaling**: `(levels_above_base // scale_step) * increment` for both dice and attacks; per-component override
- **Char-level breakpoints**: applied after base damage for all spell types; highest threshold ≤ character_level selected
- **Spellcasting modifier**: optional modifier applied to damage
- Compare, efficiency (all slots 1-9), breakeven, compare_growth endpoints
- Redis caching on all analysis endpoints + spell TTL invalidation on update

### Data Pipeline
- `seed_spells` management command with `--all --clear` flags; deduplicates on `(name, source)`
- `import_phb2024_spells` — fetches from Open5e using configurable slug; dry-run support
- `classify_phb_editions` — bulk-updates source labels for PHB 2014 spells
- `fix_upcast_components`, `fix_spell_data`, `check_upcast`, `backfill_spell_classes` maintenance commands
- PHB 2014 (396 spells), TCoE (21 summon spells), XGtE — all seeded; PHB 2024 pipeline ready

### Infrastructure
- Django 5 + DRF backend; React 18 + TypeScript + Vite frontend
- PostgreSQL 16, Redis 7, Podman containers with compose.yml
- nginx reverse proxy (port 80) → backend (port 8000 internal)
- JWT auth (access + refresh tokens), rate-limited endpoints
- GitHub Actions CI: backend lint (ruff) + type check + tests; no E2E job yet
- `scripts/rebuild.ps1` / `rebuild.sh` with layer caching (`-Frontend` flag for frontend-only rebuilds)
