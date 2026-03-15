# Spellwright — Project & Test Audit
**Date:** 2026-03-15  
**Status:** Living document — update as tests are written

---

## 1. Project Overview

A D&D 5e spell optimization platform: browse the PHB/XGtE/TCoE/2024 spell catalog, build character spellbooks, analyze expected DPR for any spell/slot/context combination, compare spells, and visualize scaling and efficiency.

**Stack:** Django 5 + DRF backend · React 18 + TypeScript + Vite frontend · PostgreSQL 16 · Redis 7 · Podman containers

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
- **Character:** `char_level`, `spell_slots_used` (JSONField), `prepared_spells_bonus`, `ruleset` ('2014'/'2024'), `school_copy_discounts`
- **Service:** `calculate_copy_cost()` (wizard copy rules: 50gp × lvl, 2hr × lvl, school discounts)
- **Endpoints:** Characters (CRUD + slot update/reset + all_spells), Spellbooks (CRUD + add/remove spell + export + duplicate + reorder + copy_cost)

### spells/
- **Models:** `Spell`, `DamageComponent`, `SpellParsingMetadata`, `SummonTemplate`, `SummonAttack`
- **Key fields:** `char_level_breakpoints` (JSONField, new), `upcast_scale_step`, `is_auto_hit`, `condition_label`, `scales_with_slot`
- **Services:** `DamageExtractionService` (regex-based spell text parsing)
- **Endpoints:** Spell CRUD + import/export/duplicate/bulk_delete, `DamageComponentViewSet`
- **Management commands:** `seed_spells`, `import_phb2024_spells`, `classify_phb_editions`, `fix_upcast_components`, `check_upcast`, `backfill_spell_classes`

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
| SpellsPage | `/spells` | Browse/search/filter/import, "Best Efficiency" sort |
| SpellDetailPage | `/spells/:id` | Detail, embedded DPR analysis, summon creature cards, char-level scaling display |
| SpellbooksPage | `/spellbooks` | Character shelf, create character/spellbooks |
| SpellbookDetailPage | `/spellbooks/:id` | Manage spells, compare panel, slot tracker, copy costs, combat log |
| ComparePage | `/compare` | Side-by-side comparison, 3D growth chart |
| AdminReviewPage | `/admin/review` | Staff QA |
| CharacterSpellsPage | `/characters/:id/spells` | All available spells for character |

### Components (17)
**Modals:** `CreateCharacterModal`, `CreateSpellbookModal`, `CreateSpellModal` (900+ LOC, new char-level breakpoints section), `ImportSpellsModal`, `AddSpellPicker`, `ClearSpellsModal`  
**Charts:** `DamageChart`, `EfficiencyChart`, `DamageComparisonChart`, `CantripScalingChart`, `GrowthChart3D` (lazy), `HitChanceHeatmap` (lazy)  
**Core:** `Layout`, `ProtectedRoute`, `AnalysisContextForm`, `SpellCard`, `SpellbookCard`, `BookColorPicker`

### Hooks (4)
`useAnalysis`, `useSpells`, `useSpellbooks`, `useCharacters`

### Services (6)
`api.ts`, `auth.ts`, `spells.ts`, `spellbooks.ts`, `analysis.ts`, `characters.ts`

---

## 4. Backend Test Coverage

**Current:** 282 tests · 92% coverage  
**Config:** `pytest.ini`, `DJANGO_SETTINGS_MODULE = config.settings.test`, threshold 80%

| File | Classes | Tests | What it covers |
|------|---------|-------|----------------|
| `test_api.py` | 5 | 13 | API root, auth, dice/attack/save calculators, rate limiting |
| `test_analysis_services.py` | 5 | 37 | Dice/attack/save calcs, spell analysis (attack/save/upcast), breakeven, parsing |
| `test_models.py` | 6 | 17 | User, Spell, DamageComponent, SpellParsingMetadata, Spellbook, AnalysisContext |
| `test_compare_growth.py` | 4 | 18 | Compare growth (cantrip/leveled), view integration, context/comparison ViewSets |
| `test_api_integration.py` | 7 | 62 | Auth, spell CRUD, spellbook ops, analysis endpoints, caching, permissions, import |
| `test_spell_actions.py` | 6 | 30 | Spell duplicate/bulk_delete/export, admin, damage component filter, auth |
| `test_edge_case_spells.py` | 1 | 1 | Acid Arrow 2-component model (placeholder) |
| `test_spellbooks.py` | ? | ? | Spellbook operations (detail TBD) |
| `test_management_commands.py` | ? | ? | Management command runners (detail TBD) |

### Not covered
- `SummonTemplate` + `SummonAttack` models — **no dedicated tests**
- Summon DPR branch edge cases (0 attacks, extreme slot levels, multiple templates)
- `char_level_breakpoints` validation (malformed JSON accepted)
- `Character.max_prepared_spells` 2024 subclass edge cases
- `SpellParsingService._normalize_raw()` PascalCase→snake_case
- Management commands (seed_spells, fix_upcast_components, classify_phb_editions)
- `upcast_scale_step = 0` (unvalidated)

---

## 5. Frontend Unit Test Coverage

**Current:** ~67 tests · 14 test files  
**Config:** `vitest.config.ts`, threshold: 80% lines/functions/statements · 75% branches

| File | Component | Tests |
|------|-----------|-------|
| `ProtectedRoute.test.tsx` | ProtectedRoute | auth state (auth, unauth, loading) |
| `SpellCard.test.tsx` | SpellCard | rendering, badges |
| `AnalysisContextForm.test.tsx` | AnalysisContextForm | form inputs, onChange |
| `useAnalysis.test.tsx` | useAnalysis | state + fetch mock |
| `useSpells.test.tsx` | useSpells | list/filter mock |
| `LoginPage.test.tsx` | LoginPage | form, invalid creds, redirect |
| `RegisterPage.test.tsx` | RegisterPage | basic rendering |
| `HomePage.test.tsx` | HomePage | basic rendering |
| `CharacterSpellsPage.test.tsx` | CharacterSpellsPage | ? |
| `ComparePage.test.tsx` | ComparePage | ❌ minimal/missing |
| `SpellDetailPage.test.tsx` | SpellDetailPage | ❌ no summon DPR tests |
| `SpellbooksPage.test.tsx` | SpellbooksPage | ❌ minimal |
| `SpellsPage.test.tsx` | SpellsPage | ❌ minimal |
| `analysis.test.ts` | analysis service | API call mocking |

### Not covered
- ComparePage — 1000+ LOC, **zero meaningful tests**
- SpellDetailPage — new embedded analysis, summon DPR results
- SpellbooksPage — character shelf, create flows
- SpellsPage — search, filter, pagination, efficiency sort
- All modal components (CreateCharacterModal, AddSpellPicker, ImportSpellsModal, CreateSpellModal)
- All chart components (DamageChart, EfficiencyChart, GrowthChart3D, HitChanceHeatmap)
- useCharacters, useSpellbooks hooks
- Empty/loading/error states across pages

---

## 6. E2E Test Coverage

**Current:** 5 spec files  
**Config:** `playwright.config.ts` — baseURL `http://localhost`, workers: 1 (sequential), retries: 2 CI, auth setup shares session  
**Note:** ❌ E2E not in CI pipeline — must run locally

| Spec | What it covers |
|------|----------------|
| `auth.setup.ts` | Login + save session state |
| `auth.spec.ts` | Login form, invalid creds, unauthenticated redirect, register link |
| `spells.spec.ts` | Spell library page load, search, click → detail |
| `spellbooks.spec.ts` | Spellbooks page load, empty state, New Character / Bind New Tome buttons |
| `compare.spec.ts` | Compare page (partial) |

### Not covered
- **Character creation flow** (click → form → submit → verify on shelf)
- **Spellbook creation + add spells** (full creation flow)
- **Spell detail + DPR analysis** (click Analyze → verify results)
- **Spellbook detail + compare panel** (open compare → run → verify chart)
- **Spell import workflow** (import JSON → count updates)
- **Spell create/edit** (create custom spell → CharLevelScaling section)
- **Error scenarios** (network failure, invalid data)
- **Mobile breakpoints** (tablet/phone view key flows)

---

## 7. Test Build-Out Plan

### Priority 1 — Critical (highest regression risk)

| ID | Type | Target | What to test | Effort | Est. tests |
|:--:|------|--------|-------------|--------|-----------|
| B1 | Backend | `test_summon_analysis.py` | Summon branch: 0 attacks, extreme slot, multiple templates, best-template selection | Medium | 8 |
| B2 | Backend | `test_models.py` (extend) | `Character.max_prepared_spells` — 2024 subclasses, edge level, bonus prepared | Small | 6 |
| B3 | Backend | `test_analysis_services.py` (extend) | `char_level_breakpoints`: valid save, attack, auto-hit; malformed JSON rejected | Small | 5 |
| F1 | Frontend unit | `ComparePage.test.tsx` | Spell selection, chart render, growth table, summary stats | Medium | 8 |
| F2 | Frontend unit | `SpellDetailPage.test.tsx` | Summon DPR results, char-level scaling display, efficiency hidden for non-scaling | Medium | 10 |
| F3 | Frontend unit | `SpellbooksPage.test.tsx` | Shelf render, character card, spellbook card, empty state | Medium | 8 |
| F4 | Frontend unit | `CreateSpellModal.test.tsx` | All form sections incl. char-level scaling: add/remove tier, validation, submit payload | Medium | 12 |
| E1 | E2E | `spellbook-creation.spec.ts` | Create character → create spellbook → add spells → verify shelf | Large | 4 tests |
| E2 | E2E | `comparison.spec.ts` | Search 2 spells → navigate to Compare → verify both selected → run → charts render | Medium | 4 tests |

**Subtotal: ~65 new tests**

---

### Priority 2 — Important

| ID | Type | Target | What to test | Effort | Est. tests |
|:--:|------|--------|-------------|--------|-----------|
| B4 | Backend | `test_models.py` (extend) | `DamageComponent` edge: 0 dice, negative flat, invalid timing | Small | 6 |
| B5 | Backend | `test_spell_actions.py` (extend) | `char_level_breakpoints` round-trip: create → export → import → compare fields | Small | 4 |
| F5 | Frontend unit | `AddSpellPicker.test.tsx` | Search, multi-select, source filter, submit | Medium | 8 |
| F6 | Frontend unit | `CreateCharacterModal.test.tsx` | Class, level, ruleset, prepared bonus, submit | Small | 6 |
| F7 | Frontend unit | `useSpellbooks.test.tsx` | Create/update/delete hook state, error | Small | 6 |
| F8 | Frontend unit | `useCharacters.test.tsx` | Hook state + error handling | Small | 5 |
| F9 | Frontend unit | `SpellsPage.test.tsx` | Search filter, pagination, import button, efficiency sort | Medium | 10 |
| F10 | Frontend unit | `SpellCard.test.tsx` (extend) | Source badge, class pills, all timing labels | Small | 5 |
| E3 | E2E | `spell-import.spec.ts` | Import JSON file → verify spells appear + counts update | Medium | 3 tests |
| E4 | E2E | `spell-detail-analysis.spec.ts` | Open spell detail → run Analyze → verify expected damage result | Medium | 3 tests |

**Subtotal: ~56 new tests**

---

### Priority 3 — Nice-to-Have

| ID | Type | Target | What to test | Effort | Est. tests |
|:--:|------|--------|-------------|--------|-----------|
| B6 | Backend | `test_management_commands.py` | `seed_spells`, `classify_phb_editions`, `fix_upcast_components` | Medium | 12 |
| B7 | Backend | `test_analysis_services.py` (extend) | `SpellParsingService._normalize_raw()` all field mappings | Small | 5 |
| F11 | Frontend unit | `DamageChart.test.tsx` | Renders bars, slot selector changes data | Small | 4 |
| F12 | Frontend unit | `EfficiencyChart.test.tsx` | Renders line chart, handles empty data | Small | 3 |
| F13 | Frontend unit | Error/loading states | All pages: loading spinner, error alert, empty state | Medium | 10 |
| E5 | E2E | `mobile.spec.ts` | Key flows on 375px viewport (auth, spells list, spellbook page) | Medium | 4 tests |
| E6 | E2E | `error-scenarios.spec.ts` | Network timeout handling, empty search result, invalid form submission | Medium | 4 tests |
| E7 | E2E | Add E2E job to CI | Configure GitHub Actions to run Playwright against deployed stack | Large | — |

**Subtotal: ~42 new tests**

---

## 8. Implementation Sequence

```
Phase 1 (next session) — Backend + critical E2E
  B1 · B2 · B3 · E1 · E2

Phase 2 — Frontend pages
  F1 · F2 · F3 · F4

Phase 3 — Frontend components + more E2E
  F5 · F6 · F7 · F8 · F9 · F10 · E3 · E4

Phase 4 — Polish + CI
  B4–B7 · F11–F13 · E5–E7
```

---

## 9. Coverage Targets

| Area | Current | Target |
|------|---------|--------|
| Backend | 282 tests · 92% | 350+ tests · 95%+ |
| Frontend unit | ~67 tests · ~70% | 160+ tests · 85%+ |
| E2E | 5 specs · ~20 tests | 12 specs · 50+ tests |
| CI pipeline | No E2E job | E2E job in GitHub Actions |
