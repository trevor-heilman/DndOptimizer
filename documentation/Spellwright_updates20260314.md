# Spellwright — Planned updates (2026-03-14)

> **Dev notes** added 2026-03-14 after codebase audit. Items are grouped roughly by effort.
> **Progress last updated: 2026-03-14** — all quick wins complete.

---

## Spells Section

- Sorting (level (default), name, etc) The user should also be able to sort by "Best efficiency at X level" Where the user can select the level

  > **Dev note:** `SpellsPage.tsx` currently has no sort control — the spell list order is whatever the backend returns (likely by name or insertion order). The API (`/api/spells/spells/`) does not currently support an `ordering` query param. Implementing basic sorts (level, name, school) requires: (1) adding `OrderingFilter` to the `SpellViewSet` backend and (2) adding a sort dropdown to the sidebar. The "best efficiency at X level" sort is a larger feature — it would need the analysis engine to be pre-run (or run on-the-fly) for all spells at the chosen slot level, then sort by `expected_damage`. **Effort**: basic sort = quick win (~2 h); efficiency sort = medium-large effort (requires batch analysis or caching).

- ~~I created the spell "Ice Guillotine" but there is no damage analysis~~

  > ✅ **Done 2026-03-14 (code)**: Added full **Damage Components** section to `CreateSpellModal` — dice count, die size, flat modifier, damage type, and timing for each component. Also added **Upcast Scaling** section (dice/slot, die size, base level, extra attacks/slot). Open Ice Guillotine in Edit mode (✎), tick Saving Throw, add components, and save.

- ~~Component cost should be seen within spell information view~~

  > ✅ **Done 2026-03-14**: Added a **Components** stat card to `SpellDetailPage.tsx` displaying V, S, M flags and the material description string.

- ~~When creating spells, source should be a dropdown with currently used sources, and a new source option~~

  > ✅ **Done 2026-03-14**: Replaced the plain `<input>` in `CreateSpellModal.tsx` with a `<datalist>` combo box populated from `useSpellSources()`. Users can pick an existing source or type a new one.

- ~~Xanathar's guide to everything is in the source filter twice~~

  > ✅ **Done 2026-03-14**: Ran a Django management command to normalise all Xanathar variants to `"Xanathar's Guide to Everything"`. Duplicate entry removed from source filter.

- A filter to show spells not in selected spellbooks (So the user can see what spells they don't have)

  > **Dev note:** No current implementation anywhere. Requires backend work: the `SpellViewSet` would need a `?not_in_spellbook=<id>` query param that excludes spells already present in the given spellbook(s). The frontend filter sidebar would need a multi-select for "Exclude from spellbook". **Effort**: medium (~half day back + front).

- ~~When creating a spell I noticed that sometimes the window grew too big, and I was unable to see/use the close or "x" buttons.~~

  > ✅ **Done 2026-03-14**: Added `max-h-[90vh]` to the inner card div in `ModalShell.tsx`. Fixes all modals.

- ~~Create spell window should automatically close after spell creation is successful~~

  > ✅ **Done 2026-03-14**: Added `handleClose()` call after `mutateAsync` in `CreateSpellModal.tsx` `handleSubmit`. Modal now auto-closes on successful create or edit.

  - ~~For each damage component there should be a check box for if it can crit or not.~~

  > ✅ **Done 2026-03-14**: Added `on_crit_extra` field to `DamageComponentEntry` interface, form state, mapper, default value (`true`), and a **Can crit** checkbox to the damage component row in `CreateSpellModal.tsx`.

- ~~Why is the default school for spell creation evocation? It should be Abjuration since that is alphabetically first~~

  > ✅ **Done 2026-03-14**: Changed `defaultForm.school` from `'evocation'` to `'abjuration'` in `CreateSpellModal.tsx`.

---

## Spellbooks Section

- It doesn't look like we are calculating the cost to recreate a spellbook correctly. Wizards school based subclasses reduce the time and gold cost of the selected school.

  > **Dev note:** `calculate_copy_cost()` in `backend/spellbooks/services.py` currently handles two sources of discount: (1) `order_of_scribes` subclass → 50% off all spells, and (2) values stored in `character.school_copy_discounts` (a JSONField, e.g. `{"evocation": 50}`). The **bug** is that school-specialisation subclasses (School of Evocation, School of Abjuration, etc.) are NOT automatically mapped to a `school_copy_discounts` entry — the cost reduction is only applied if someone manually sets that dict. Per D&D 5e PHB (2014), each of the 8 school subclasses grants 50% off gold and time for copying spells of their school ("Savant" feature). **Root-cause fix**: in `calculate_copy_cost()`, derive the school discount automatically from `character.subclass` (e.g. `school_of_evocation` → add `{'evocation': 50}` to effective discounts). The `school_copy_discounts` field can remain as a way to override or add extra discounts for unusual cases. **Effort**: backend-only, small (~1–2 h including tests).

- The user should be able to see the character's spell slots while viewing a specific book.

  > **Dev note:** `frontend/src/constants/spellSlots.ts` already contains complete slot tables for all classes (including Warlock pact magic). The `Spellbook` model has a FK to `Character` which has `character_class` and `character_level`. The `spell_slots_used` array is also stored on `Character`. **Fix**: add a slot-display panel to `SpellbookDetailPage.tsx` that looks up the character's max slots from `spellSlots.ts` and shows them alongside `spell_slots_used`. Purely frontend work. **Effort**: small–medium (~half day for a clean UI).

- ~~The user should be able to cast spells and track the spell slots available while in a specific book. It should also track hits/misses to try and gauge enemy stats~~

  > ✅ **Done 2026-03-15 (casting)**: Added a ⚡ Cast button to each levelled spell card in `SpellbookDetailPage.tsx`. Clicking it increments `spell_slots_used` for that spell's level via `updateSlots.mutate()`. The button is grayed out and disabled when no slots remain at that level; cantrips (level 0) never show the button. Slot availability is derived from a `slotsAvailable` useMemo (max − used per level). **Hit/miss tracking + enemy AC inference** remains a separate open item — see Priority Summary.

- The ui element for spellbook recreation cost seems a bit overkill and clunky we should rethink this.

  > **Dev note:** `CopyCostSection` in `SpellbookDetailPage.tsx` (line ~159) is a collapsible accordion that expands to show a per-spell cost table. The data returned includes `total_gold`, `total_hours`, per-spell breakdown, and discount badges. The UI shows all that detail when expanded. A lighter design option: show just the totals (`X gp / Y hours`) inline, with a "see breakdown" toggle if needed. Possibly integrate it into the spellbook stats row rather than a separate card. **Effort**: frontend-only redesign, medium (~2–4 h depending on chosen design).

- ~~Not all spells scale evenly — some scale every other spell level (e.g. Hex +1d6 per 2 levels, Shatter +1d8 per 2 levels)~~

  > ✅ **Done 2026-03-14**: Added `upcast_scale_step` IntegerField (null, default 1) to `Spell` and `DamageComponent` models (migration 0014). `_upcast_extra_dice()` and `_upcast_extra_attacks()` in `backend/analysis/services.py` now compute `(levels_above // step) * increment`. `_effective_dice()` for per-component scaling also respects the step. Added "Scale every N levels" number input to the Upcast Scaling section of `CreateSpellModal.tsx`. Wired through both serializers and the `Spell` TS type. — the step size is implicitly 1. The `Spell` model (`backend/spells/models.py` lines 65–71) has `upcast_base_level`, `upcast_dice_increment`, `upcast_die_size`, and `upcast_attacks_increment`, but **no step field**. `DamageComponent` has a per-component `upcast_dice_increment` override but also no step. **Fix**: (1) add `upcast_scale_step` IntegerField (default=1) to both `Spell` and `DamageComponent`, (2) change `_upcast_extra_dice()` to `(levels_above // scale_step) * increment`, (3) wire the field through `SpellSerializer` / `DamageComponentSerializer`, (4) add a "Scale every N levels" number input to the Upcast Scaling section of `CreateSpellModal.tsx`. Requires migration + backend + serializer + UI. **Effort**: Small–Medium.

- Character-level scaling for non-cantrip spells (e.g. Green-Flame Blade, Booming Blade, Shadow Blade)

  > **Dev note:** Cantrips already scale by character level — `_analyze_spell_at_slot()` in `backend/analysis/services.py` branches at line 278 and uses `context.character_level` via `_cantrip_tier_multiplier()`. Non-cantrip character-level scaling (e.g. GFB adds +CHA mod on level 5, more on level 11) requires a **new data model**: ideally a `char_level_breakpoints` JSONField on `Spell` specifying `{5: {flat_modifier: "mod"}, 11: {dice_count: 1, die_size: 8}}` or similar. The analysis engine would then need a second branch that merges these breakpoints at the provided `context.character_level`. Needs design decision (struct of breakpoints, interaction with existing upcast) before implementation. **Effort**: Medium–Large.

- ~~Conditional damage triggers (e.g. "When grappling", "After tripping") as alternatives to on-hit timing~~

  > ✅ **Done 2026-03-14**: Added `condition_label` CharField (max_length=100, null/blank) to `DamageComponent` (migration 0013). Listed in `DamageComponentSerializer`. In `CreateSpellModal.tsx`, the timing select and condition input share a flex row — users can type a free-form condition. In `SpellDetailPage.tsx`, condition labels render as a blue badge appended to the timing text. in `backend/spells/models.py` covers `on_hit`, `on_fail`, `on_success`, `end_of_turn`, `per_round`, and `delayed`. It has no condition-based timing values. Two options: (1) extend `TIMING_CHOICES` with new slugs (`when_grappling`, `after_trip`, etc.) — requires a migration each time a new condition is added; or (2) add a freeform `condition_label` CharField (null/blank) to `DamageComponent` — cleaner, no combinatorial explosion. The condition would be informational/display-only; the analysis engine would treat condition-gated damage as a user-configured inclusion/exclusion toggle (similar to how `per_round` vs `on_hit` is already handled). Requires: migration + `DamageComponentSerializer` + `CreateSpellModal.tsx` UI row + `SpellDetailPage.tsx` display. **Effort**: Small.

- Not all damage spells are showing up in the spellbooks "Compare damage spells" section. ex. not seeing magic missile in the marbled tome

  > **Dev note:** `damageSpells` in `SpellbookDetailPage.tsx` (lines 383–390) filters for: `(is_attack_roll || is_saving_throw) && damage_components.length > 0`. Magic Missile is **neither** an attack roll nor a saving throw — it auto-hits — so it is excluded even if it has damage components. To include it, the filter needs a third condition: spells where `is_attack_roll=false && is_saving_throw=false` but `damage_components` is populated (auto-hit / guaranteed damage spells). A clean solution might be to add a dedicated `is_auto_hit` boolean field to the `Spell` model and include it in the filter: `(is_attack_roll || is_saving_throw || is_auto_hit) && damage_components.length > 0`. Alternatively, simply relax the filter to `damage_components.length > 0` (remove the attack/save requirement) which would include all spells with damage components. **Effort**: if using `is_auto_hit` field: backend migration + frontend = medium; if just relaxing the filter: trivial frontend change (~10 min, but requires verifying no non-damage spells accidentally have damage_components set).

- I am not seeing summoning spells in the "Compare damage spells" section

  > **Dev note:** Summoning spells use `summon_templates` (not `damage_components`) for their damage model. The current "Compare damage spells" panel only handles `damage_components`-based DPR. Including summoning spells would require a second code path that reads DPR from `analysis.results.per_template[*].expected_dpr` (already calculated by the analysis engine). **Effort**: medium–large. A simpler interim option is to display summoning spells in a separate "Summoning DPR" panel rather than bolting them into the existing compare flow. Requires design decision before implementation.

- ~~Source filter when adding spells to a spellbook~~

  > ✅ **Done 2026-03-14**: Added `sourceFilter` state, `useSpellSources()` call, filter clause in `useMemo`, and a `<MultiSelect>` source picker to `AddSpellPicker.tsx`. Entirely frontend, no backend changes needed.

- ~~Auto-hit custom spells (e.g. Fist of Cold) could not have damage components added in the Create/Edit modal~~

  > ✅ **Done 2026-03-14**: `CreateSpellModal.tsx` guarded the entire Damage Components (and Upcast Scaling) section with `{(form.is_attack_roll || form.is_saving_throw) && (`. `is_auto_hit` was absent from `SpellFormState`, had no checkbox, and was never mapped from `spellToEdit`. The analysis engine already correctly handled `is_auto_hit` (line 650 in `services.py`). **Fix**: added `is_auto_hit` to `SpellFormState`, `defaultForm`, and `spellToFormState()`; added "Auto-hit / Guaranteed" checkbox in the Spell Type section; extended both conditions to `|| form.is_auto_hit`.

- ~~Tags selector when creating or editing a spell~~

  > ✅ **Done 2026-03-14**: `SPELL_TAGS` constant already existed in `frontend/src/constants/spellColors.ts`. `Spell.tags` is a JSONField on the backend model and was already in `SpellCreateUpdateSerializer`. `CreateSpellModal.tsx` had no tags UI. **Fix**: added `tags: string[]` to `SpellFormState`, `defaultForm`, and `spellToFormState()`; added `toggleTag()` helper; added a checkbox group after the Classes section using `SPELL_TAGS` with human-readable labels.

---

## Calculations

- Please double check the calculations for lucky and halfling lucky. These are fundamentally different and not the same thing

  > **Dev note (VERIFIED ✓):** Already correctly differentiated in `backend/analysis/services.py`. `lucky_feat` uses the full advantage formula `1 - (1-p)^2` for both hit probability and crit probability. `halfling` only rerolls natural 1s: hit probability becomes `min(0.95, base_prob * 1.05)` and crit probability is **unchanged** (the nat-1 → hit conversion adds only ~0.0025 crit chance, treated as negligible). This is mathematically faithful to the rules. No changes needed.

- ~~Damage distribution graph is showing crit info for spells that cannot crit (e.g. Fireball)~~

  > ✅ **Done 2026-03-14**: Added `showCrit?: boolean` prop to `DamageChart` and `ScalingBarChart`. Crit bars, crit pills, and crit columns are hidden when `showCrit={false}`. `SpellDetailPage.tsx` passes `showCrit={spell.is_attack_roll === true}`.

---

## Project Organisation and Structure

- ~~Classify imported spells with their correct source edition (PHB 2014 vs PHB 2024)~~

  > ✅ **Done 2026-03-14**: Added `classify_phb_editions` management command in `backend/spells/management/commands/`. Ran it: 396 seeded non-custom spells with blank source updated to `"Player's Handbook (2014)"`. The `SOURCE_ABBREV` map in `AddSpellPicker.tsx` already mapped `"Player's Handbook (2014)"` to `'PHB 2014'` badge. Spells imported via `fetch_open5e.py` get `document__title` from the Open5e API (typical value: `"Player's Handbook"` or `"Systems Reference Document"`); spells from `convert_xgte.py` get `"Xanathar's Guide to Everything"`. None of the import scripts disambiguate 2014 vs 2024. **Fix**: write a one-off management command (e.g. `python manage.py classify_phb_editions`) that queries the DB for all spells with `source` matching known 2014 titles (SRD, early Open5e dumps) and updates them, then separately handles 2024 entries if any were imported. May need a brief audit of what `source` values currently exist (`Spell.objects.values_list('source', flat=True).distinct()`). Alternatively, do it through the Django admin `change list` with filters + bulk edit. **Effort**: Trivial–Small (data task).

- ~~I am seeing a .venv and venv. This seems redundant. I would like to make .venv the canonical one.~~

  > ✅ **Done 2026-03-14**: Deleted `venv/`. `.venv/` is now the only env directory. Scripts were already excluding both via rsync — no changes needed there.

- ~~We should make sure we aren't pushing the spell jsons to github by including them on the .gitignore.~~

  > ✅ **Done 2026-03-14**: Added `backend/data/*.json` to `.gitignore`. Ran `git rm --cached` to untrack `spells.json`, `TCoE_spells.json`, and `XGtE_Spells_fixed.json`.

- ~~Rebuild is too slow — can we speed it up?~~

  > ✅ **Done 2026-03-14**: Removed `--no-cache` from the `podman build ... frontend` call in `scripts/rebuild.sh`. Podman now reuses the npm-install layer when `package.json` is unchanged, cutting `-Frontend` rebuild time from ~50 s to ~10–15 s.

- ~~Import PHB 2024 spells into the database with the correct source label~~

  > ✅ **Done 2026-03-15**: `seed_spells.py` now deduplicates on `(name, source)` before every insert — same name + same source is skipped; same name + different source is allowed (so PHB 2014 and PHB 2024 versions of the same spell coexist). Created `backend/data/fetch_phb2024.py` to fetch from Open5e using a configurable `--slug` arg (default `free-rules-2024`) and write `phb2024_spells.json` with `source = "Player's Handbook (2024)"`. Created management command `import_phb2024_spells` (`--slug`, `--dry-run`) that fetches + parses + imports in one step with the same dedup rule. **To run**: confirm the correct slug at `https://api.open5e.com/v1/documents/` then run `python manage.py import_phb2024_spells --slug <slug>` inside the backend container.

---

## Priority Summary

| Item | Effort | Notes |
|---|---|---|
| Modal overflow (× button hidden) | ~~Trivial~~ | ✅ Done — `ModalShell.tsx` max-h-[90vh] |
| Add spell JSON to .gitignore | ~~Trivial~~ | ✅ Done — git rm --cached + .gitignore |
| Ice Guillotine damage analysis | ~~Trivial~~ | ✅ Done (code) — data entry still needed in UI |
| Lucky/Halfling Lucky | N/A | Already correct ✓ |
| venv cleanup | ~~Trivial~~ | ✅ Done — venv/ deleted |
| Component cost in spell view | ~~Quick win~~ | ✅ Done — `SpellDetailPage.tsx` stat card |
| Source field → combo box | ~~Quick win~~ | ✅ Done — `CreateSpellModal.tsx` datalist |
| Xanathar's duplicate | ~~Quick win~~ | ✅ Done — data normalised |
| Spell sorting (basic: level/name) | ~~Small~~ | ✅ Done — `SpellListParams` `ordering` + sort dropdown in `SpellsPage.tsx` sidebar |
| Copy cost subclass discount bug | ~~Small~~ | ✅ Done — `_SCHOOL_SUBCLASS_MAP` + `setdefault()` in `services.py` |
| Magic Missile in Compare | ~~Small–Medium~~ | ✅ Done — `damageSpells` filter relaxed to `damage_components.length > 0` |
| Copy cost UI redesign | ~~Medium~~ | ✅ Done — compact inline row with ▾ breakdown toggle in `CopyCostSection` |
| Spell slots display in spellbook | ~~Medium~~ | ✅ Done — `SpellSlotsPanel` with clickable dots + Reset, wired to `useUpdateSpellSlots` |
| Source filter in AddSpellPicker | ~~Quick win~~ | ✅ Done — `AddSpellPicker.tsx` + `useSpellSources()` |
| Damage chart crit bars on save spells | ~~Quick win~~ | ✅ Done — `DamageChart.tsx` `showCrit` prop |
| Auto-close CreateSpellModal on success | ~~Trivial~~ | ✅ Done — `CreateSpellModal.tsx` `handleSubmit` |
| Faster rebuild (remove `--no-cache`) | ~~Trivial~~ | ✅ Done — `rebuild.sh` 1-line fix |
| "Not in spellbooks" filter | ~~Medium~~ | ✅ Done — `?not_in_spellbook=<uuid>` in `SpellViewSet` + dropdown in `SpellsPage` sidebar |
| Summoning spells in Compare | Medium–Large | New DPR rendering path |
| Spell slot tracking (cast spells) | ~~Medium~~ | ✅ Done — ⚡ Cast button on each spell card; increments `spell_slots_used` via `updateSlots`; grayed when no slots remain |
| Efficiency sort (best at X level) | Large | Batch analysis + sort |
| Hit/miss tracking + enemy stat inference | Large | New model + analysis layer |
| Uneven upcast scaling (every N levels) | ~~Small–Medium~~ | ✅ Done — `upcast_scale_step` on `Spell` + `DamageComponent`; analysis engine uses `levels_above // step`; modal "Scale every N levels" input |
| Character-level scaling for non-cantrips | Medium–Large | New `char_level_breakpoints` JSONField + engine branch |
| Conditional damage triggers (grapple, trip…) | ~~Small~~ | ✅ Done — `condition_label` CharField on `DamageComponent`; inline text input in modal; badge in `SpellDetailPage` |
| Classify imported spells PHB 2014 vs 2024 | ~~Trivial–Small~~ | ✅ Done — `classify_phb_editions` mgmt command; 396 PHB (2014) spells updated |
| Auto-hit spells missing from Create/Edit modal (Fist of Cold bug) | ~~Small~~ | ✅ Done — `is_auto_hit` added to `SpellFormState`, checkbox added, Damage Components condition extended |
| Tags selector in Create/Edit spell modal | ~~Trivial~~ | ✅ Done — `tags` field + `toggleTag()` + checkbox group using `SPELL_TAGS` |
| Import PHB 2024 spells with correct source | ~~Small–Medium~~ | ✅ Done — `seed_spells.py` deduplicates on `(name, source)`; `fetch_phb2024.py` + `import_phb2024_spells` mgmt command ready to run |


# Objective Staging

