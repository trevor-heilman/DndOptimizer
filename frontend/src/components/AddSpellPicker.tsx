/**
 * AddSpellPicker
 *
 * Full-featured modal for searching and adding spells to a spellbook.
 * Features:
 *  - Live search by spell name
 *  - Level filter pills (All / C / 1–9)
 *  - School filter dropdown
 *  - Spells grouped by level, each group collapsible
 *  - Per-row Add button that switches to "✓ Added" immediately (optimistic)
 *  - Multiple spells can be added without closing the modal
 */
import { useState, useMemo } from 'react';
import { useSpells, useSpellSources } from '../hooks/useSpells';
import { useAddSpellToSpellbook } from '../hooks/useSpellbooks';
import { getSchoolColors, DAMAGE_TYPES } from '../constants/spellColors';
import { MultiSelect } from './MultiSelect';
import type { MultiSelectOption } from './MultiSelect';
import type { Spell } from '../types/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
] as const;

const CLASS_CHOICES = [
  { value: 'artificer', label: 'Artificer' },
  { value: 'bard',      label: 'Bard' },
  { value: 'cleric',    label: 'Cleric' },
  { value: 'druid',     label: 'Druid' },
  { value: 'paladin',   label: 'Paladin' },
  { value: 'ranger',    label: 'Ranger' },
  { value: 'sorcerer',  label: 'Sorcerer' },
  { value: 'warlock',   label: 'Warlock' },
  { value: 'wizard',    label: 'Wizard' },
];

const TAG_FILTERS = [
  { value: 'damage',        label: 'Damage' },
  { value: 'healing',       label: 'Healing' },
  { value: 'aoe',           label: 'AOE' },
  { value: 'crowd_control', label: 'CC' },
  { value: 'utility',       label: 'Utility' },
  { value: 'concentration', label: 'Conc' },
  { value: 'ritual',        label: 'Ritual' },
];

const LEVEL_PILL_LABEL: Record<number, string> = {
  0: 'C', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
};

const LEVEL_SECTION_NAME: Record<number, string> = {
  0: 'Cantrips',
  1: 'Level 1', 2: 'Level 2', 3: 'Level 3', 4: 'Level 4',
  5: 'Level 5', 6: 'Level 6', 7: 'Level 7', 8: 'Level 8', 9: 'Level 9',
};

const SOURCE_ABBREV: Record<string, string> = {
  "Player's Handbook":                 'PHB',
  "Player's Handbook (2014)":          'PHB 2014',
  "Player's Handbook 2014":            'PHB 2014',
  "Player's Handbook (2024)":          'PHB 2024',
  "Player's Handbook 2024":            'PHB 2024',
  "Xanathar's Guide to Everything":    'XGtE',
  "Tasha's Cauldron of Everything":    'TCoE',
  "Mordenkainen's Tome of Foes":       'MTF',
  "Sword Coast Adventurer's Guide":    'SCAG',
  "Strixhaven: A Curriculum of Chaos": 'SCC',
  "Systems Reference Document":        'SRD',
  "SRD 5.1":                           'SRD',
};

// ─── SpellRow ────────────────────────────────────────────────────────────────

interface SpellRowProps {
  spell: Spell;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: (id: string) => void;
}

function SpellRow({ spell, isAdded, isAdding, onAdd }: SpellRowProps) {
  const schoolColor = getSchoolColors(spell.school);
  const schoolLabel = spell.school.charAt(0).toUpperCase() + spell.school.slice(1);

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${
        isAdded ? 'opacity-40' : 'hover:bg-smoke-800/60'
      }`}
    >
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-display text-sm text-parchment-100 truncate min-w-0">
            {spell.name}
          </span>
          {spell.concentration && (
            <span
              className="shrink-0 text-[10px] px-1 rounded font-display"
              style={{ color: '#fcd34d', border: '1px solid #78350f55', background: '#3d2a0a55' }}
            >
              ◎
            </span>
          )}
          {spell.ritual && (
            <span
              className="shrink-0 text-[10px] px-1 rounded font-display"
              style={{ color: '#c4b5fd', border: '1px solid #4c1d9555', background: '#2e1a5f55' }}
            >
              R
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs font-body text-smoke-400">
            {spell.casting_time} · {spell.range}
          </span>
          <span
            className="text-[10px] font-display px-1.5 rounded shrink-0"
            style={{
              background: schoolColor.bg,
              color: schoolColor.text,
              border: `1px solid ${schoolColor.border}44`,
            }}
          >
            {schoolLabel}
          </span>
          {spell.source && (
            <span className="text-[10px] font-display px-1.5 rounded shrink-0 bg-smoke-800/60 text-smoke-400 border border-smoke-700/50">
              {SOURCE_ABBREV[spell.source] ?? spell.source}
            </span>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        disabled={isAdded || isAdding}
        onClick={() => onAdd(spell.id)}
        className={`shrink-0 text-xs font-display px-3 py-1.5 rounded border transition-all ${
          isAdded
            ? 'border-smoke-700 text-smoke-500 cursor-default'
            : isAdding
            ? 'border-smoke-600 text-smoke-400 cursor-wait'
            : 'border-gold-700 text-gold-400 hover:bg-gold-900/30 hover:text-gold-300 active:scale-95'
        }`}
      >
        {isAdding ? '…' : isAdded ? '✓ Added' : '+ Add'}
      </button>
    </div>
  );
}

// ─── LevelGroup ──────────────────────────────────────────────────────────────

interface LevelGroupProps {
  level: number;
  spells: Spell[];
  localAddedIds: Set<string>;
  addingIds: Set<string>;
  onAdd: (id: string) => void;
}

function LevelGroup({ level, spells, localAddedIds, addingIds, onAdd }: LevelGroupProps) {
  const [open, setOpen] = useState(true);
  const addedCount = spells.filter(s => localAddedIds.has(s.id)).length;

  return (
    <div className="mb-2">
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded hover:bg-smoke-800/40 transition-colors group"
      >
        <span className="font-display text-xs text-smoke-400 group-hover:text-smoke-300 uppercase tracking-widest flex-1 text-left">
          {LEVEL_SECTION_NAME[level]}
        </span>
        <span className="font-body text-xs text-smoke-500">
          {addedCount > 0 && (
            <span className="text-gold-600 mr-2">{addedCount} added</span>
          )}
          {spells.length}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-smoke-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Spell rows */}
      {open && (
        <div>
          {spells.map(spell => (
            <SpellRow
              key={spell.id}
              spell={spell}
              isAdded={localAddedIds.has(spell.id)}
              isAdding={addingIds.has(spell.id)}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AddSpellPicker ──────────────────────────────────────────────────────────

export interface AddSpellPickerProps {
  spellbookId: string;
  /** IDs of spells already in the spellbook — shown as already-added on open */
  alreadyAddedIds: Set<string>;
  /** Pre-select the class filter to this class (e.g. the spellbook's character class) */
  spellbookClass?: string;
  onClose: () => void;
}

const SCHOOL_OPTIONS: MultiSelectOption[] = SCHOOLS.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

const CLASS_OPTIONS: MultiSelectOption[] = CLASS_CHOICES.map((c) => ({
  value: c.value,
  label: c.label,
}));

export function AddSpellPicker({ spellbookId, alreadyAddedIds, spellbookClass, onClose }: AddSpellPickerProps) {
  const [search, setSearch] = useState('');
  // Multi-select levels: empty Set = all levels
  const [levelFilter, setLevelFilter] = useState<Set<number>>(new Set());
  const [schoolFilter, setSchoolFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>(spellbookClass ? [spellbookClass] : []);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [damageTypeFilter, setDamageTypeFilter] = useState<string[]>([]);
  const [concentrationOnly, setConcentrationOnly] = useState(false);
  const [componentFilter, setComponentFilter] = useState({ v: false, s: false, m: false });
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  // Track adds locally so buttons flip to "Added" without closing
  const [localAddedIds, setLocalAddedIds] = useState<Set<string>>(new Set(alreadyAddedIds));

  const { data: spellsResponse, isLoading } = useSpells({ page: 1, page_size: 1000 });
  const { data: sourcesData } = useSpellSources();
  const addSpell = useAddSpellToSpellbook(spellbookId);

  const allSpells = spellsResponse?.results ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allSpells.filter(spell => {
      if (levelFilter.size > 0 && !levelFilter.has(spell.level)) return false;
      if (schoolFilter.length > 0 && !schoolFilter.includes(spell.school)) return false;
      // Class filter: show spell if it has no class data yet, or if any selected class matches
      if (classFilter.length > 0 && spell.classes && spell.classes.length > 0 && !classFilter.some(c => spell.classes!.includes(c))) return false;
      if (tagFilter.length > 0 && !tagFilter.some(t => spell.tags?.includes(t))) return false;
      if (damageTypeFilter.length > 0) {
        const dmgTypes = spell.damage_components?.map(dc => dc.damage_type) ?? [];
        if (!damageTypeFilter.some(dt => dmgTypes.includes(dt))) return false;
      }
      if (concentrationOnly && !spell.concentration) return false;
      if (componentFilter.v && !spell.components_v) return false;
      if (componentFilter.s && !spell.components_s) return false;
      if (componentFilter.m && !spell.components_m) return false;
      if (sourceFilter.length > 0 && !sourceFilter.includes(spell.source ?? '')) return false;
      if (q && !spell.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allSpells, levelFilter, schoolFilter, classFilter, tagFilter, damageTypeFilter, concentrationOnly, componentFilter, sourceFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<number, Spell[]>();
    for (const spell of filtered) {
      const arr = map.get(spell.level) ?? [];
      arr.push(spell);
      map.set(spell.level, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [filtered]);

  const handleAdd = async (spellId: string) => {
    setAddingIds(prev => new Set([...prev, spellId]));
    try {
      await addSpell.mutateAsync(spellId);
      setLocalAddedIds(prev => new Set([...prev, spellId]));
    } catch {
      // mutation error is surfaced by React Query; just clean up adding state
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(spellId);
        return next;
      });
    }
  };

  const newlyAdded = localAddedIds.size - alreadyAddedIds.size;

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="dnd-card border-t-2 border-arcane-700 w-full sm:max-w-2xl flex flex-col shadow-2xl rounded-none sm:rounded-lg"
        style={{ maxHeight: '90dvh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-smoke-700 shrink-0">
          <div>
            <h2 className="font-display text-xl text-arcane-300">✦ Add Spells</h2>
            <p className="font-body text-sm text-smoke-400 mt-0.5">
              {isLoading
                ? 'Loading spell compendium…'
                : `${filtered.length.toLocaleString()} spell${filtered.length !== 1 ? 's' : ''} available`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-smoke-400 hover:text-parchment-200 transition-colors p-1 -mt-1 -mr-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="p-4 border-b border-smoke-700 space-y-3 shrink-0">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="dnd-input font-body w-full text-sm"
            autoFocus
          />

          {/* Level pills — multi-select; "All" clears selection */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setLevelFilter(new Set())}
              className={`font-display text-xs px-2.5 py-1 rounded border transition-colors ${
                levelFilter.size === 0
                  ? 'bg-arcane-800/80 border-arcane-600 text-arcane-200'
                  : 'border-smoke-600 text-smoke-400 hover:border-smoke-500 hover:text-smoke-300'
              }`}
            >
              All
            </button>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
              <button
                key={lvl}
                onClick={() =>
                  setLevelFilter(prev => {
                    const next = new Set(prev);
                    if (next.has(lvl)) next.delete(lvl); else next.add(lvl);
                    return next;
                  })
                }
                className={`font-display text-xs px-2.5 py-1 rounded border transition-colors ${
                  levelFilter.has(lvl)
                    ? 'bg-arcane-800/80 border-arcane-600 text-arcane-200'
                    : 'border-smoke-600 text-smoke-400 hover:border-smoke-500 hover:text-smoke-300'
                }`}
              >
                {LEVEL_PILL_LABEL[lvl]}
              </button>
            ))}
          </div>

          {/* Row: school + class + source multi-select filters */}
          <div className="flex gap-2 flex-wrap">
            <MultiSelect
              placeholder="All Schools"
              options={SCHOOL_OPTIONS}
              value={schoolFilter}
              onChange={setSchoolFilter}
              className="flex-1 min-w-[120px]"
            />
            <MultiSelect
              placeholder="All Classes"
              options={CLASS_OPTIONS}
              value={classFilter}
              onChange={setClassFilter}
              className="flex-1 min-w-[120px]"
            />
            <MultiSelect
              placeholder="All Sources"
              options={(sourcesData ?? []).map(s => ({ value: s, label: s }))}
              value={sourceFilter}
              onChange={setSourceFilter}
              className="flex-1 min-w-[120px]"
            />
          </div>

          {/* Tag filter pills — multi-select */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTagFilter([])}
              className={`font-display text-xs px-2.5 py-1 rounded border transition-colors ${
                tagFilter.length === 0
                  ? 'bg-smoke-800/80 border-smoke-500 text-smoke-200'
                  : 'border-smoke-700 text-smoke-500 hover:border-smoke-500 hover:text-smoke-300'
              }`}
            >
              All
            </button>
            {TAG_FILTERS.map(tf => (
              <button
                key={tf.value}
                onClick={() =>
                  setTagFilter(prev =>
                    prev.includes(tf.value) ? prev.filter(t => t !== tf.value) : [...prev, tf.value]
                  )
                }
                className={`font-display text-xs px-2.5 py-1 rounded border transition-colors ${
                  tagFilter.includes(tf.value)
                    ? 'bg-arcane-800/80 border-arcane-600 text-arcane-200'
                    : 'border-smoke-700 text-smoke-500 hover:border-smoke-500 hover:text-smoke-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Damage Type + Concentration + Components */}
          <div className="flex flex-wrap gap-3 items-start">
            <MultiSelect
              placeholder="All Damage Types"
              options={DAMAGE_TYPES.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
              value={damageTypeFilter}
              onChange={setDamageTypeFilter}
              className="flex-1 min-w-[140px]"
            />
            <div className="flex flex-wrap gap-3 items-center">
              {[
                { key: 'concentration' as const, label: 'Conc', state: concentrationOnly, set: setConcentrationOnly },
              ].map(({ key, label, state, set }) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={state}
                    onChange={e => set(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-gold-500"
                  />
                  <span className="font-body text-xs text-smoke-400 group-hover:text-smoke-200">{label}</span>
                </label>
              ))}
              <span className="font-display text-xs text-smoke-500">Components:</span>
              {(['v', 's', 'm'] as const).map(c => (
                <label key={c} className="flex items-center gap-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={componentFilter[c]}
                    onChange={e => setComponentFilter(prev => ({ ...prev, [c]: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded accent-gold-500"
                  />
                  <span className="font-body text-xs text-smoke-400 group-hover:text-smoke-200 uppercase">{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Spell list ── */}
        <div className="overflow-y-auto flex-1 px-2 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-arcane-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <p className="font-body text-smoke-400 text-center py-12">
              {search || levelFilter.size > 0 || schoolFilter.length > 0 || classFilter.length > 0 || tagFilter.length > 0 || damageTypeFilter.length > 0 || sourceFilter.length > 0 || concentrationOnly || componentFilter.v || componentFilter.s || componentFilter.m
                ? 'No spells match your filters.'
                : 'No spells available to add.'}
            </p>
          ) : (
            grouped.map(([level, spells]) => (
              <LevelGroup
                key={level}
                level={level}
                spells={spells}
                localAddedIds={localAddedIds}
                addingIds={addingIds}
                onAdd={handleAdd}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-smoke-700 flex items-center justify-between shrink-0">
          <span className="font-body text-sm">
            {newlyAdded > 0 ? (
              <span className="text-gold-400">
                {newlyAdded} spell{newlyAdded !== 1 ? 's' : ''} added
              </span>
            ) : (
              <span className="text-smoke-500">Click + Add on any spell</span>
            )}
          </span>
          <button onClick={onClose} className="btn-secondary text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
