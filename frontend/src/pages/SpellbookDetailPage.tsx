/**
 * Spellbook Detail Page
 *
 * Shows all spells in the spellbook, grouped by level with collapsible sections.
 * Spells come from the API via `prepared_spells[].spell`.
 *
 * Features:
 *  - Edit mode: toggle with ✎ Edit / ✓ Done button
 *      · Name / description / character class editing
 *      · Remove buttons only visible in edit mode
 *  - Filter bar: name search, school filter, prepared-only toggle
 *  - Sort: level ↑↓, name A–Z / Z–A, school A–Z
 *  - Spell row badges: ⚔ Atk Roll / {type} Save, concentration, ritual
 *  - Tag pills: damage, aoe, healing, crowd_control, utility, concentration, ritual
 */
import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useSpellbook,
  useUpdateSpellbook,
  useRemoveSpellFromSpellbook,
  useUpdatePreparedSpell,
  useSpellbookCopyCost,
} from '../hooks/useSpellbooks';
import { useBatchAnalyzeSpells, useGetSpellEfficiency } from '../hooks/useAnalysis';
import { useCharacter } from '../hooks/useCharacters';
import { getSchoolColors } from '../constants/spellColors';
import { AddSpellPicker } from '../components/AddSpellPicker';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { LoadingSpinner, AlertMessage, EmptyState, ChartCard } from '../components/ui';
import { BookColorPicker } from '../components/BookColorPicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import type { PreparedSpell, Spell, AnalysisContext, BookColor } from '../types/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const LEVEL_SECTION_NAME: Record<number, string> = {
  0: 'Cantrips',
  1: 'Level 1', 2: 'Level 2', 3: 'Level 3', 4: 'Level 4',
  5: 'Level 5', 6: 'Level 6', 7: 'Level 7', 8: 'Level 8', 9: 'Level 9',
};

const SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
] as const;

const TAG_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  damage:        { color: '#fca5a5', bg: '#450a0a55', border: '#7f1d1d' },
  aoe:           { color: '#fdba74', bg: '#43150255', border: '#9a3412' },
  healing:       { color: '#86efac', bg: '#05260d55', border: '#166534' },
  concentration: { color: '#fcd34d', bg: '#3d2a0a55', border: '#92400e' },
  ritual:        { color: '#c4b5fd', bg: '#2e1a5f55', border: '#5b21b6' },
  crowd_control: { color: '#a5b4fc', bg: '#1e1b4b55', border: '#4338ca' },
  utility:       { color: '#67e8f9', bg: '#08324455', border: '#0e7490' },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function MechanicBadge({ spell }: { spell: Spell }) {
  if (spell.is_attack_roll) {
    return (
      <span
        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-display"
        style={{ color: '#fca5a5', background: '#450a0a55', border: '1px solid #7f1d1d' }}
      >
        ⚔ Atk Roll
      </span>
    );
  }
  if (spell.is_saving_throw) {
    return (
      <span
        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-display"
        style={{ color: '#a5b4fc', background: '#1e1b4b55', border: '1px solid #4338ca' }}
      >
        {spell.save_type ? `${spell.save_type} Save` : 'Save'}
      </span>
    );
  }
  return null;
}

function TagPills({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <>
      {tags.map(tag => {
        const s = TAG_STYLES[tag] ?? { color: '#94a3b8', bg: '#0f172a55', border: '#334155' };
        return (
          <span
            key={tag}
            className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-display capitalize"
            style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
          >
            {tag.replace('_', ' ')}
          </span>
        );
      })}
    </>
  );
}

// ─── PreparedSpellRow ────────────────────────────────────────────────────────

interface PreparedSpellRowProps {
  ps: PreparedSpell;
  onTogglePrepared: (spellId: string, prepared: boolean) => void;
  onRemove: (spellId: string) => void;
  isUpdating: boolean;
  isEditMode: boolean;
  spellbookId: string;
  spellbookName: string;
  saveDC?: number;
  atkBonus?: number;
}

function PreparedSpellRow({
  ps, onTogglePrepared, onRemove, isUpdating, isEditMode,
  spellbookId, spellbookName, saveDC, atkBonus,
}: PreparedSpellRowProps) {
  const { spell } = ps;
  const schoolColor = getSchoolColors(spell.school);
  const schoolLabel = spell.school.charAt(0).toUpperCase() + spell.school.slice(1);
  const levelLabel  = spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`;

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-4 rounded-lg transition-all ${
        ps.prepared
          ? 'bg-smoke-900/80 border border-gold-900/40'
          : 'bg-smoke-900/40 border border-smoke-800/60'
      }`}
    >
      {/* Prepared toggle */}
      <button
        onClick={() => onTogglePrepared(spell.id, ps.prepared)}
        disabled={isUpdating}
        title={ps.prepared ? 'Mark as unprepared' : 'Prepare this spell'}
        className={`shrink-0 text-xl leading-none transition-all hover:scale-110 active:scale-95 ${
          isUpdating ? 'opacity-40 cursor-wait' : 'cursor-pointer'
        } ${ps.prepared ? 'text-gold-400' : 'text-smoke-600 hover:text-smoke-400'}`}
      >
        {ps.prepared ? '★' : '☆'}
      </button>

      {/* Spell info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/spells/${spell.id}`}
            state={{ spellbookId, spellbookName, saveDC, atkBonus }}
            className="font-display text-sm text-parchment-100 hover:text-gold-300 transition-colors"
          >
            {spell.name}
          </Link>
          {spell.concentration && (
            <span
              className="shrink-0 text-[10px] px-1 rounded font-display"
              style={{ color: '#fcd34d', border: '1px solid #78350f55', background: '#3d2a0a55' }}
            >
              ◎ Conc
            </span>
          )}
          {spell.ritual && (
            <span
              className="shrink-0 text-[10px] px-1 rounded font-display"
              style={{ color: '#c4b5fd', border: '1px solid #4c1d9555', background: '#2e1a5f55' }}
            >
              Ritual
            </span>
          )}
          <MechanicBadge spell={spell} />
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
          <span
            className="text-[10px] font-display px-1.5 rounded shrink-0 opacity-40"
            style={{ background: '#2a2a35', color: '#fbbf24', border: '1px solid #4b4b5844' }}
          >
            {levelLabel}
          </span>
          <TagPills tags={spell.tags} />
        </div>
      </div>

      {/* Remove — only in edit mode */}
      {isEditMode && (
        <button
          onClick={() => onRemove(spell.id)}
          title="Remove from spellbook"
          className="shrink-0 text-smoke-600 hover:text-crimson-400 transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── LevelSection ────────────────────────────────────────────────────────────

interface LevelSectionProps {
  level: number;
  preparedSpells: PreparedSpell[];
  onTogglePrepared: (spellId: string, prepared: boolean) => void;
  onRemove: (spellId: string) => void;
  updatingIds: Set<string>;
  isEditMode: boolean;
  spellbookId: string;
  spellbookName: string;
  saveDC?: number;
  atkBonus?: number;
}

function LevelSection({
  level, preparedSpells, onTogglePrepared, onRemove, updatingIds, isEditMode,
  spellbookId, spellbookName, saveDC, atkBonus,
}: LevelSectionProps) {
  const [open, setOpen] = useState(true);
  const preparedCount = preparedSpells.filter(ps => ps.prepared).length;

  return (
    <section className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-2 px-1 group"
      >
        <div className="flex-1 flex items-center gap-3">
          <span className="font-display text-xs uppercase tracking-widest text-smoke-400 group-hover:text-smoke-300 transition-colors">
            {LEVEL_SECTION_NAME[level]}
          </span>
          <span className="font-body text-xs text-smoke-600">
            {preparedSpells.length}
          </span>
          {preparedCount > 0 && (
            <span className="font-body text-xs text-gold-600">
              ★ {preparedCount} prepared
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-smoke-600 group-hover:text-smoke-400 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="h-px bg-gradient-to-r from-smoke-700/60 via-smoke-700/20 to-transparent mb-2" />
      {open && (
        <div className="space-y-1.5 mb-6">
          {preparedSpells.map(ps => (
            <PreparedSpellRow
              key={ps.id}
              ps={ps}
              onTogglePrepared={onTogglePrepared}
              onRemove={onRemove}
              isUpdating={updatingIds.has(ps.spell.id)}
              isEditMode={isEditMode}
              spellbookId={spellbookId}
              spellbookName={spellbookName}
              saveDC={saveDC}
              atkBonus={atkBonus}
            />
          ))}
        </div>
      )}
      {!open && <div className="mb-4" />}
    </section>
  );
}

// ─── CopyCostSection ─────────────────────────────────────────────────────────

function CopyCostSection({ spellbookId, characterId }: { spellbookId: string; characterId?: string }) {
  const [open, setOpen] = useState(false);
  const { data: cost, isLoading, error } = useSpellbookCopyCost(spellbookId, characterId, open);

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen(v => !v)}
        className="font-display text-sm flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors mb-3"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        📜 Spellbook Copy Cost
      </button>

      {open && (
        <div className="dnd-card p-6 border-l-4 border-gold-700">
          <h2 className="font-display text-xl font-semibold text-gold-300 mb-4">Copy Cost Estimate</h2>

          {isLoading && <LoadingSpinner />}
          {error && (
            <AlertMessage variant="error" title="Could not calculate cost" message="An error occurred fetching copy cost." />
          )}

          {cost && (
            <>
              {/* Summary row */}
              <div className="flex gap-6 mb-5">
                <div className="text-center">
                  <div className="font-display text-2xl font-bold text-gold-300">{cost.total_gold} gp</div>
                  <div className="font-display text-[10px] uppercase tracking-widest text-smoke-500 mt-0.5">Total Gold</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-2xl font-bold text-parchment-200">{cost.total_hours} hr</div>
                  <div className="font-display text-[10px] uppercase tracking-widest text-smoke-500 mt-0.5">Total Hours</div>
                </div>
                {cost.scribes_discount_applied && (
                  <div className="flex items-center">
                    <span
                      className="font-display text-xs px-2 py-1 rounded"
                      style={{ background: 'rgba(109,40,217,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}
                    >
                      Order of Scribes −50%
                    </span>
                  </div>
                )}
                {Object.keys(cost.school_discounts_applied).length > 0 && (
                  <div className="flex items-center flex-wrap gap-1">
                    {Object.keys(cost.school_discounts_applied).map(s => (
                      <span
                        key={s}
                        className="font-display text-[10px] px-1.5 py-0.5 rounded capitalize"
                        style={{ background: 'rgba(6,78,59,0.4)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }}
                      >
                        {s} −{cost.school_discounts_applied[s]}%
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Per-spell breakdown */}
              <div className="border-t border-smoke-700 pt-4">
                <p className="font-display text-[10px] uppercase tracking-widest text-smoke-500 mb-2">Per-Spell Breakdown</p>
                <div className="space-y-1">
                  {cost.spell_entries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 font-body text-sm">
                      <span className="flex-1 text-parchment-300 truncate">{entry.name}</span>
                      <span className="text-smoke-500 capitalize text-xs">{entry.school}</span>
                      <span className="text-gold-400 w-16 text-right">{entry.gold_cost} gp</span>
                      <span className="text-smoke-400 w-14 text-right">{entry.time_hours} hr</span>
                      {entry.discount_pct > 0 && (
                        <span
                          className="font-display text-[9px] px-1 rounded"
                          style={{ background: 'rgba(109,40,217,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}
                        >
                          −{entry.discount_pct}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SpellbookDetailPage ─────────────────────────────────────────────────────

export function SpellbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spellbook, isLoading, error } = useSpellbook(id!);
  const updateSpellbook = useUpdateSpellbook(id!);
  const removeSpell     = useRemoveSpellFromSpellbook(id!);
  const updatePrepared  = useUpdatePreparedSpell(id!);
  const { data: linkedCharacter } = useCharacter(spellbook?.character ?? '', !!spellbook?.character);

  // Edit mode
  const [isEditMode,        setIsEditMode]        = useState(false);
  const [editedName,        setEditedName]        = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedColor,       setEditedColor]       = useState<BookColor>('violet');
  const [editedLabelColor,  setEditedLabelColor]  = useState('');

  // Damage comparison
  const batchAnalyze = useBatchAnalyzeSpells();
  const spellEfficiency = useGetSpellEfficiency();
  const [showDamageCompare, setShowDamageCompare] = useState(false);
  const [checkedSpellIds,   setCheckedSpellIds]   = useState<Set<string>>(new Set());
  const [damageMode,        setDamageMode]        = useState<'compare' | 'bylevel'>('bylevel');
  const [efficiencyData,    setEfficiencyData]    = useState<Record<string, {slot_level: number; expected_damage: number}[]>>({});
  const [damageContext,     setDamageContext]      = useState<AnalysisContext>({
    target_ac: 15,
    caster_attack_bonus: 5,
    spell_save_dc: 15,
    target_save_bonus: 0,
    number_of_targets: 1,
    advantage: false,
    disadvantage: false,
    spell_slot_level: 1,
    crit_enabled: true,
    half_damage_on_save: true,
    evasion_enabled: false,
  });

  // Filter / sort
  const [searchFilter,  setSearchFilter]  = useState('');
  const [schoolFilter,  setSchoolFilter]  = useState('');
  const [preparedOnly,  setPreparedOnly]  = useState(false);
  const [sortBy,        setSortBy]        = useState<'level' | 'name' | 'school'>('level');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');

  // Misc
  const [isAddSpellOpen, setIsAddSpellOpen] = useState(false);
  const [updatingIds,    setUpdatingIds]    = useState<Set<string>>(new Set());

  // ── Derived data ────────────────────────────────────────────────────────

  const preparedSpells = spellbook?.prepared_spells ?? [];

  const filteredAndSorted = useMemo(() => {
    let list = [...preparedSpells];
    const q = searchFilter.trim().toLowerCase();
    if (q)           list = list.filter(ps => ps.spell.name.toLowerCase().includes(q));
    if (schoolFilter) list = list.filter(ps => ps.spell.school === schoolFilter);
    if (preparedOnly) list = list.filter(ps => ps.prepared);

    list.sort((a, b) => {
      let cmp = 0;
      if      (sortBy === 'level')  cmp = a.spell.level - b.spell.level;
      else if (sortBy === 'name')   cmp = a.spell.name.localeCompare(b.spell.name);
      else if (sortBy === 'school') cmp = a.spell.school.localeCompare(b.spell.school);
      if (cmp === 0) cmp = a.spell.name.localeCompare(b.spell.name); // tiebreak
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [preparedSpells, searchFilter, schoolFilter, preparedOnly, sortBy, sortDir]);

  const groupedByLevel = useMemo(() => {
    const map = new Map<number, PreparedSpell[]>();
    for (const ps of filteredAndSorted) {
      const arr = map.get(ps.spell.level) ?? [];
      arr.push(ps);
      map.set(ps.spell.level, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [filteredAndSorted]);

  const alreadyAddedIds = useMemo(
    () => new Set(preparedSpells.map(ps => ps.spell.id)),
    [preparedSpells]
  );

  const totalPrepared = preparedSpells.filter(ps => ps.prepared).length;

  const levelCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const ps of preparedSpells) {
      map.set(ps.spell.level, (map.get(ps.spell.level) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [preparedSpells]);
  const isFiltered    = !!(searchFilter || schoolFilter || preparedOnly || sortBy !== 'level' || sortDir !== 'asc');

  // Damage spells eligible for comparison
  const damageSpells = useMemo(() => {
    return preparedSpells.filter(
      ps =>
        (ps.spell.is_attack_roll || ps.spell.is_saving_throw) &&
        ps.spell.damage_components &&
        ps.spell.damage_components.length > 0
    );
  }, [preparedSpells]);

  // ── Early returns ────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSpinner />;
  if (error || !spellbook) {
    return (
      <div>
        <AlertMessage
          variant="error"
          title="Spellbook Not Found"
          message="The spellbook you're looking for doesn't exist."
        />
        <div className="mt-4">
          <button onClick={() => navigate('/spellbooks')} className="btn-gold">
            Back to Spellbooks
          </button>
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEnterEditMode = () => {
    setEditedName(spellbook.name);
    setEditedDescription(spellbook.description ?? '');
    setEditedColor((spellbook.book_color ?? 'violet') as BookColor);
    setEditedLabelColor(spellbook.label_color ?? '');
    setIsEditMode(true);
  };

  const handleDoneEdit = async () => {
    const updates: Record<string, string | number | null> = {};
    if (editedName.trim() && editedName.trim() !== spellbook.name)
      updates.name = editedName.trim();
    if (editedDescription !== (spellbook.description ?? ''))
      updates.description = editedDescription.trim();
    if (editedColor !== (spellbook.book_color ?? 'violet'))
      updates.book_color = editedColor;
    if (editedLabelColor !== (spellbook.label_color ?? ''))
      updates.label_color = editedLabelColor;
    if (Object.keys(updates).length > 0)
      await updateSpellbook.mutateAsync(updates as any);
    setIsEditMode(false);
  };

  const handleRemoveSpell = async (spellId: string) => {
    if (!window.confirm('Remove this spell from the spellbook?')) return;
    await removeSpell.mutateAsync(spellId);
  };

  const handleTogglePrepared = async (spellId: string, currentPrepared: boolean) => {
    setUpdatingIds(prev => new Set([...prev, spellId]));
    try {
      await updatePrepared.mutateAsync({ spellId, isPrepared: !currentPrepared });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(spellId);
        return next;
      });
    }
  };

  const handleSortChange = (val: string) => {
    const [by, dir] = val.split('-') as [typeof sortBy, typeof sortDir];
    setSortBy(by);
    setSortDir(dir);
  };

  const clearFilters = () => {
    setSearchFilter('');
    setSchoolFilter('');
    setPreparedOnly(false);
    setSortBy('level');
    setSortDir('asc');
  };

  const handleOpenDamageCompare = () => {
    // Default-check all damage spells when opening
    setCheckedSpellIds(new Set(damageSpells.map(ps => ps.spell.id)));
    batchAnalyze.reset();
    setEfficiencyData({});
    setShowDamageCompare(true);
  };

  const handleToggleSpellCheck = (spellId: string) => {
    setCheckedSpellIds(prev => {
      const next = new Set(prev);
      if (next.has(spellId)) next.delete(spellId);
      else next.add(spellId);
      return next;
    });
  };

  const handleRunDamageCompare = () => {
    const ids = [...checkedSpellIds];
    if (ids.length === 0) return;
    batchAnalyze.mutate({ spellIds: ids, context: damageContext });
  };

  const handleRunByLevel = async () => {
    const ids = [...checkedSpellIds];
    if (ids.length === 0) return;
    const spellMap = new Map(damageSpells.map(ps => [ps.spell.id, ps.spell]));
    const results: Record<string, {slot_level: number; expected_damage: number}[]> = {};
    await Promise.allSettled(ids.map(async id => {
      const sp = spellMap.get(id);
      const minLevel = sp && sp.level === 0 ? 0 : Math.max(1, sp?.level ?? 1);
      const maxLevel = sp && sp.level === 0 ? 3 : 9;
      try {
        const resp = await import('../services/analysis').then(m =>
          m.default.getSpellEfficiency(id, damageContext, minLevel, maxLevel)
        );
        results[id] = resp.efficiency_by_slot;
      } catch { /* skip failed spells */ }
    }));
    setEfficiencyData(results);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/spellbooks"
        className="font-body text-gold-500 hover:text-gold-300 text-sm mb-4 inline-block"
      >
        ← Back to Spellbooks
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Name */}
          <div className="flex-1 min-w-0">
            {isEditMode ? (
              <input
                type="text"
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                className="font-display text-3xl font-bold text-gold-300 bg-transparent border-b-2 border-gold-600 focus:outline-none w-full"
                onKeyDown={e => { if (e.key === 'Escape') setIsEditMode(false); }}
              />
            ) : (
              <h1 className="font-display text-3xl font-bold text-gold-300 flex items-center gap-3">
                <svg
                  className="w-7 h-7 text-gold-500 shrink-0"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                {spellbook.name}
              </h1>
            )}
          </div>

          {/* Edit / Done */}
          <button
            onClick={isEditMode ? handleDoneEdit : handleEnterEditMode}
            className={`shrink-0 text-sm ${isEditMode ? 'btn-gold' : 'btn-secondary'}`}
            disabled={updateSpellbook.isPending}
          >
            {isEditMode ? '✓ Done' : '✎ Edit'}
          </button>
        </div>

        {/* Description */}
        {isEditMode ? (
          <textarea
            value={editedDescription}
            onChange={e => setEditedDescription(e.target.value)}
            className="dnd-input font-body resize-none w-full mt-1"
            rows={2}
            placeholder="Add a description…"
          />
        ) : (
          spellbook.description && (
            <p className="font-body text-parchment-400 italic text-sm">
              {spellbook.description}
            </p>
          )
        )}

        {/* Book color + spine text color — edit mode */}
        {isEditMode && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="font-display text-xs uppercase tracking-widest text-smoke-400 block mb-1.5">
                Book Color
              </label>
              <BookColorPicker value={editedColor} onChange={setEditedColor} />
            </div>
            <div>
              <label className="font-display text-xs uppercase tracking-widest text-smoke-400 block mb-1.5">
                Spine Text Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[{value: '', label: 'Auto'}, {value: '#ffffff', label: 'White'}, {value: '#0f172a', label: 'Dark'}, {value: '#fbbf24', label: 'Gold'}, {value: '#e2e8f0', label: 'Silver'}, {value: '#ef4444', label: 'Red'}].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setEditedLabelColor(opt.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-body text-xs border transition-all ${
                      editedLabelColor === opt.value
                        ? 'border-gold-500 ring-1 ring-gold-500/60 bg-smoke-800'
                        : 'border-smoke-600 bg-smoke-900 hover:border-smoke-400'
                    }`}
                  >
                    {opt.value && (
                      <span
                        className="inline-block w-3 h-3 rounded-full border border-smoke-600"
                        style={{ background: opt.value }}
                      />
                    )}
                    <span style={{ color: opt.value || '#94a3b8' }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats — view mode */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="font-body text-sm text-parchment-400">
            <span className="font-semibold text-parchment-200">{preparedSpells.length}</span>{' '}
            spell{preparedSpells.length !== 1 ? 's' : ''}
          </span>
          {totalPrepared > 0 && (
            <span className="bg-gold-900/30 text-gold-400 border border-gold-800/50 px-2.5 py-0.5 rounded-full font-body text-xs">
              ★ {totalPrepared} prepared
            </span>
          )}
        </div>

        {/* Level breakdown */}
        {levelCounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {levelCounts.map(([level, count]) => (
              <span
                key={level}
                className="font-display text-[10px] px-2 py-0.5 rounded"
                style={{ color: '#94a3b8', background: '#1e2335', border: '1px solid #2d3555' }}
              >
                {LEVEL_SECTION_NAME[level]}: <span style={{ color: '#e2e8f0' }}>{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <button onClick={() => setIsAddSpellOpen(true)} className="btn-gold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Spells
        </button>
      </div>

      {/* ── Filter / Sort bar ───────────────────────────────────────────── */}
      {preparedSpells.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Filter by name…"
            className="dnd-input font-body text-sm py-1.5 max-w-[180px]"
          />
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="dnd-input font-body text-sm py-1.5"
          >
            <option value="">All Schools</option>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={e => handleSortChange(e.target.value)}
            className="dnd-input font-body text-sm py-1.5"
          >
            <option value="level-asc">Level ↑</option>
            <option value="level-desc">Level ↓</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="school-asc">School A–Z</option>
          </select>
          <button
            onClick={() => setPreparedOnly(v => !v)}
            className={`font-display text-xs px-3 py-1.5 rounded border transition-colors ${
              preparedOnly
                ? 'bg-gold-900/40 border-gold-700 text-gold-300'
                : 'border-smoke-600 text-smoke-400 hover:border-smoke-500 hover:text-smoke-300'
            }`}
          >
            ★ Prepared only
          </button>
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="font-display text-xs text-smoke-500 hover:text-smoke-300 transition-colors"
            >
              × Clear
            </button>
          )}
        </div>
      )}

      {/* ── Spell list or empty state ───────────────────────────────────── */}
      {preparedSpells.length === 0 ? (
        <EmptyState
          icon="📖"
          title="No Spells Yet"
          description="Add spells to your spellbook to begin your arcane collection."
          action={{ label: 'Add Your First Spell', onClick: () => setIsAddSpellOpen(true) }}
        />
      ) : filteredAndSorted.length === 0 ? (
        <p className="font-body text-smoke-400 text-center py-12">
          No spells match your filters.
        </p>
      ) : (
        <div>
          {groupedByLevel.map(([level, spells]) => (
            <LevelSection
              key={level}
              level={level}
              preparedSpells={spells}
              onTogglePrepared={handleTogglePrepared}
              onRemove={handleRemoveSpell}
              updatingIds={updatingIds}
              isEditMode={isEditMode}
              spellbookId={spellbook.id}
              spellbookName={spellbook.name}
              saveDC={linkedCharacter?.spell_save_dc}
              atkBonus={linkedCharacter?.spell_attack_bonus}
            />
          ))}
        </div>
      )}

      {/* ── Damage Comparison ──────────────────────────────────────────── */}
      {damageSpells.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => showDamageCompare ? setShowDamageCompare(false) : handleOpenDamageCompare()}
            className="font-display text-sm flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${showDamageCompare ? 'rotate-90' : ''}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            ⚡ Compare Damage Spells ({damageSpells.length})
          </button>

          {showDamageCompare && (
            <div className="dnd-card p-6 border-l-4 border-gold-700">
              <h2 className="font-display text-xl font-semibold text-gold-300 mb-4">
                Damage Comparison
              </h2>

              {/* Spell checklist */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {damageSpells.map(ps => (
                  <label
                    key={ps.spell.id}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={checkedSpellIds.has(ps.spell.id)}
                      onChange={() => handleToggleSpellCheck(ps.spell.id)}
                      className="accent-gold-500 w-4 h-4"
                    />
                    <span className="font-body text-sm text-parchment-200 group-hover:text-parchment-100 transition-colors truncate">
                      {ps.spell.name}
                      <span className="text-smoke-500 ml-1 text-xs">
                        {ps.spell.level === 0 ? '(Cantrip)' : `(Lvl ${ps.spell.level})`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => setCheckedSpellIds(new Set(damageSpells.map(ps => ps.spell.id)))}
                  className="font-display text-xs text-smoke-400 hover:text-smoke-200 transition-colors"
                >
                  Select all
                </button>
                <span className="text-smoke-600">·</span>
                <button
                  onClick={() => setCheckedSpellIds(new Set())}
                  className="font-display text-xs text-smoke-400 hover:text-smoke-200 transition-colors"
                >
                  Deselect all
                </button>
              </div>

              {/* Context form */}
              <div className="mb-4 border-t border-smoke-700 pt-4">
                <AnalysisContextForm context={damageContext} onChange={setDamageContext} />
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setDamageMode('compare')}
                  className={`font-display text-xs px-3 py-1.5 rounded border transition-colors ${
                    damageMode === 'compare'
                      ? 'bg-gold-900/50 border-gold-600 text-gold-300'
                      : 'bg-smoke-800 border-smoke-600 text-smoke-400 hover:text-smoke-200'
                  }`}
                >
                  ⚡ Compare at Slot
                </button>
                <button
                  onClick={() => setDamageMode('bylevel')}
                  className={`font-display text-xs px-3 py-1.5 rounded border transition-colors ${
                    damageMode === 'bylevel'
                      ? 'bg-gold-900/50 border-gold-600 text-gold-300'
                      : 'bg-smoke-800 border-smoke-600 text-smoke-400 hover:text-smoke-200'
                  }`}
                >
                  📈 By Level
                </button>
              </div>

              {damageMode === 'compare' ? (
                <>
                  <button
                    onClick={handleRunDamageCompare}
                    disabled={checkedSpellIds.size === 0 || batchAnalyze.isPending}
                    className="btn-gold text-sm disabled:opacity-40 disabled:cursor-not-allowed mb-4"
                  >
                    {batchAnalyze.isPending ? 'Analyzing…' : `⚡ Analyze ${checkedSpellIds.size} spell${checkedSpellIds.size !== 1 ? 's' : ''}`}
                  </button>

                  {batchAnalyze.isError && (
                    <AlertMessage variant="error" message="Analysis failed. Some spells may have no parsed damage components." />
                  )}

                  {/* Bar chart */}
                  {batchAnalyze.data && (() => {
                    const chartData = damageSpells
                      .filter(ps => batchAnalyze.data![ps.spell.id] !== undefined)
                      .map(ps => ({
                        name: ps.spell.name,
                        expectedDamage: Number(batchAnalyze.data![ps.spell.id].results.expected_damage.toFixed(2)),
                        efficiency:     Number(batchAnalyze.data![ps.spell.id].results.efficiency.toFixed(2)),
                      }))
                      .sort((a, b) => b.expectedDamage - a.expectedDamage);

                    if (chartData.length === 0) return null;

                    return (
                      <ChartCard title="Expected Damage by Spell" className="mt-2">
                        <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
                          <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#c4a882', fontSize: 12 }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={130}
                              tick={{ fill: '#c4a882', fontSize: 12 }}
                              tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                            />
                            <Tooltip
                              contentStyle={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, color: '#c4a882' }}
                              formatter={(value, name) => [
                                value ?? 0,
                                name === 'expectedDamage' ? 'Expected Damage' : 'Efficiency',
                              ]}
                            />
                            <Bar dataKey="expectedDamage" name="Expected Damage" radius={[0, 4, 4, 0]}>
                              {chartData.map((_, i) => (
                                <Cell key={i} fill={i === 0 ? '#d4af37' : '#7c3aed'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        {/* Efficiency table */}
                        <div className="mt-4 border-t border-smoke-700 pt-4">
                          <p className="font-display text-xs uppercase tracking-widest text-smoke-500 mb-2">Efficiency (dmg / slot level)</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {chartData.map(row => (
                              <div key={row.name} className="flex justify-between font-body text-sm bg-smoke-800 rounded px-3 py-1.5">
                                <span className="text-parchment-300 truncate mr-2">{row.name}</span>
                                <span className="text-gold-400 font-semibold shrink-0">{row.efficiency}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ChartCard>
                    );
                  })()}
                </>
              ) : (
                <>
                  <button
                    onClick={handleRunByLevel}
                    disabled={checkedSpellIds.size === 0 || spellEfficiency.isPending}
                    className="btn-gold text-sm disabled:opacity-40 disabled:cursor-not-allowed mb-4"
                  >
                    {spellEfficiency.isPending ? 'Analyzing…' : `📈 Analyze ${checkedSpellIds.size} spell${checkedSpellIds.size !== 1 ? 's' : ''} by level`}
                  </button>

                  {/* By-level line chart */}
                  {Object.keys(efficiencyData).length > 0 && (() => {
                    const spellMap = new Map(damageSpells.map(ps => [ps.spell.id, ps.spell]));
                    // Collect all slot levels present across all spells
                    const allLevels = new Set<number>();
                    Object.values(efficiencyData).forEach(pts =>
                      pts.forEach(p => allLevels.add(p.slot_level))
                    );
                    const sortedLevels = [...allLevels].sort((a, b) => a - b);

                    // Build recharts data: one row per slot_level
                    const lineData = sortedLevels.map(lvl => {
                      const row: Record<string, string | number> = {
                        slotLevel: lvl === 0 ? 'Cantrip' : `Slot ${lvl}`,
                      };
                      Object.entries(efficiencyData).forEach(([id, pts]) => {
                        const sp = spellMap.get(id);
                        const pt = pts.find(p => p.slot_level === lvl);
                        if (pt && sp) row[sp.name] = Number(pt.expected_damage.toFixed(2));
                      });
                      return row;
                    });

                    const spellNames = [...checkedSpellIds]
                      .map(id => spellMap.get(id)?.name)
                      .filter(Boolean) as string[];

                    const LINE_COLORS = [
                      '#d4af37', '#7c3aed', '#06b6d4', '#22c55e', '#f97316',
                      '#ec4899', '#a78bfa', '#34d399', '#fb923c', '#60a5fa',
                    ];

                    return (
                      <ChartCard title="Expected Damage by Spell Level" className="mt-2">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
                            <XAxis dataKey="slotLevel" tick={{ fill: '#c4a882', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#c4a882', fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, color: '#c4a882' }}
                            />
                            <Legend wrapperStyle={{ color: '#c4a882', fontSize: 12 }} />
                            {spellNames.map((name, i) => (
                              <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Copy Cost Calculator ─────────────────────────────────────── */}
      {preparedSpells.length > 0 && (
        <CopyCostSection spellbookId={id!} characterId={spellbook.character ?? undefined} />
      )}

      {/* ── Add Spell Picker modal ──────────────────────────────────────── */}
      {isAddSpellOpen && (
        <AddSpellPicker
          spellbookId={id!}
          alreadyAddedIds={alreadyAddedIds}
          spellbookClass={spellbook.character_class}
          onClose={() => setIsAddSpellOpen(false)}
        />
      )}
    </div>
  );
}

export default SpellbookDetailPage;
