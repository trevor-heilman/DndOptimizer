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
import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useSpellbook,
  useUpdateSpellbook,
  useRemoveSpellFromSpellbook,
  useUpdatePreparedSpell,
  useSpellbookCopyCost,
} from '../hooks/useSpellbooks';
import { useSpellSources } from '../hooks/useSpells';
import { useBatchAnalyzeSpells, useGetSpellEfficiency } from '../hooks/useAnalysis';
import { useCharacter } from '../hooks/useCharacters';
import { useUpdateSpellSlots, useResetSpellSlots } from '../hooks/useCharacters';
import { SPELL_SCHOOLS, DND_CLASSES, DAMAGE_TYPES, SPELL_TAGS } from '../constants/spellColors';
import { getSpellSlots } from '../constants/spellSlots';
import { SpellCard, SpellCardGrid } from '../components/SpellCard';
import { MultiSelect } from '../components/MultiSelect';
import { AddSpellPicker } from '../components/AddSpellPicker';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { LoadingSpinner, AlertMessage, EmptyState, ChartCard } from '../components/ui';
import { BookColorPicker } from '../components/BookColorPicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import type { PreparedSpell, AnalysisContext, BookColor } from '../types/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const LEVEL_SECTION_NAME: Record<number, string> = {
  0: 'Cantrips',
  1: 'Level 1', 2: 'Level 2', 3: 'Level 3', 4: 'Level 4',
  5: 'Level 5', 6: 'Level 6', 7: 'Level 7', 8: 'Level 8', 9: 'Level 9',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

interface SpellbookSpellCardProps {
  ps: PreparedSpell;
  onTogglePrepared: (spellId: string, prepared: boolean) => void;
  onRemove: (spellId: string) => void;
  isUpdating: boolean;
  isEditMode: boolean;
  linkState: object;
  /** Callback invoked when the user clicks Cast. Only provided for levelled spells with a linked character. */
  onCast?: () => void;
  /** Whether at least one slot of the spell's level is available to use. */
  hasSlotAvailable?: boolean;
}

function SpellbookSpellCard({
  ps, onTogglePrepared, onRemove, isUpdating, isEditMode, linkState, onCast, hasSlotAvailable,
}: SpellbookSpellCardProps) {
  return (
    <div className={`relative flex flex-col transition-opacity ${!ps.prepared ? 'opacity-55 hover:opacity-80' : ''}`}>
      <SpellCard spell={ps.spell} linkState={linkState} className="h-full" />
      {/* Action overlay — pointer-events-none so non-button areas still hit the SpellCard link */}
      <div className="absolute top-0 right-0 z-10 p-2 flex items-center gap-1.5 pointer-events-none">
        {isEditMode && (
          <button
            className="pointer-events-auto text-smoke-500 hover:text-crimson-400 transition-colors p-0.5"
            title="Remove from spellbook"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(ps.spell.id); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {onCast !== undefined && (
          <button
            className={`pointer-events-auto text-sm leading-none transition-all hover:scale-110 active:scale-95 ${
              hasSlotAvailable ? 'text-arcane-400 hover:text-arcane-300' : 'text-smoke-700 cursor-not-allowed'
            }`}
            title={hasSlotAvailable ? 'Cast spell (uses one slot)' : 'No slots available'}
            disabled={!hasSlotAvailable}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (hasSlotAvailable) onCast(); }}
          >
            ⚡
          </button>
        )}
        <button
          className={`pointer-events-auto text-base leading-none transition-all hover:scale-110 active:scale-95 ${
            isUpdating ? 'opacity-40 cursor-wait' : 'cursor-pointer'
          } ${ps.prepared ? 'text-gold-400' : 'text-smoke-500 hover:text-smoke-300'}`}
          title={ps.prepared ? 'Mark as unprepared' : 'Prepare this spell'}
          disabled={isUpdating}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePrepared(ps.spell.id, ps.prepared); }}
        >
          {ps.prepared ? '★' : '☆'}
        </button>
      </div>
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
  linkState: object;
  onCast?: (spellLevel: number) => void;
  slotsAvailable?: number[];
}

function LevelSection({
  level, preparedSpells, onTogglePrepared, onRemove, updatingIds, isEditMode, linkState, onCast, slotsAvailable,
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
        <SpellCardGrid className="mb-6">
          {preparedSpells.map(ps => (
            <SpellbookSpellCard
              key={ps.id}
              ps={ps}
              onTogglePrepared={onTogglePrepared}
              onRemove={onRemove}
              isUpdating={updatingIds.has(ps.spell.id)}
              isEditMode={isEditMode}
              linkState={linkState}
              onCast={onCast && ps.spell.level > 0 ? () => onCast(ps.spell.level) : undefined}
              hasSlotAvailable={ps.spell.level > 0 ? (slotsAvailable?.[ps.spell.level - 1] ?? 0) > 0 : undefined}
            />
          ))}
        </SpellCardGrid>
      )}
      {!open && <div className="mb-4" />}
    </section>
  );
}

// ─── SpellSlotsPanel ──────────────────────────────────────────────────────────

const SLOT_LEVEL_NAMES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function SpellSlotsPanel({
  characterClass,
  characterLevel,
  slotsUsed,
  onToggle,
  onReset,
}: {
  characterClass: string;
  characterLevel: number;
  slotsUsed?: number[];
  onToggle?: (levelIndex: number, newUsed: number) => void;
  onReset?: () => void;
}) {
  const maxSlots = getSpellSlots(characterClass, characterLevel);
  if (!maxSlots) return null;

  const interactive = !!onToggle;

  return (
    <div className="mt-4 pt-3 border-t border-smoke-800/60">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display text-[10px] uppercase tracking-widest text-smoke-500">Spell Slots</p>
        {onReset && (
          <button
            onClick={onReset}
            className="font-display text-[10px] text-smoke-500 hover:text-parchment-300 transition-colors"
            title="Reset all slots"
          >
            ↺ reset
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {maxSlots.map((max, i) => {
          if (max === 0) return null;
          const used = slotsUsed?.[i] ?? 0;
          const available = Math.max(0, max - used);
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="font-display text-[10px] text-smoke-400 w-7 shrink-0">{SLOT_LEVEL_NAMES[i]}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: max }).map((_, j) => (
                  <button
                    key={j}
                    type="button"
                    disabled={!interactive}
                    onClick={() => {
                      if (!onToggle) return;
                      // clicking a full dot uses it; clicking an empty dot restores it
                      const newUsed = j < available ? used + 1 : Math.max(0, used - 1);
                      onToggle(i, newUsed);
                    }}
                    className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                      interactive ? 'cursor-pointer hover:opacity-70' : 'cursor-default'
                    }`}
                    style={j < available
                      ? { background: 'rgba(109,40,217,0.7)', borderColor: 'rgba(139,92,246,0.8)' }
                      : { background: 'transparent', borderColor: 'rgba(71,85,105,0.5)' }
                    }
                    aria-label={j < available ? `Use ${SLOT_LEVEL_NAMES[i]} slot` : `Restore ${SLOT_LEVEL_NAMES[i]} slot`}
                  />
                ))}
              </div>
              {slotsUsed && used > 0 && (
                <span className="font-body text-[10px] text-smoke-500">{available}/{max}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CopyCostSection ─────────────────────────────────────────────────────────

function CopyCostSection({ spellbookId, characterId }: { spellbookId: string; characterId?: string }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { data: cost, isLoading, error } = useSpellbookCopyCost(spellbookId, characterId);

  if (isLoading) {
    return (
      <div className="mt-6 pt-4 border-t border-smoke-800/60">
        <p className="font-display text-[10px] uppercase tracking-widest text-smoke-500 mb-1">📜 Scribing Cost</p>
        <div className="h-4 w-32 bg-smoke-800 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !cost) return null;

  return (
    <div className="mt-6 pt-4 border-t border-smoke-800/60">
      {/* Compact summary row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-display text-[10px] uppercase tracking-widest text-smoke-500">📜 Scribing Cost</span>
        <span className="font-display font-semibold text-gold-300">{cost.total_gold} gp</span>
        <span className="font-body text-xs text-smoke-600">·</span>
        <span className="font-display font-semibold text-parchment-300">{cost.total_hours} hr</span>
        {cost.scribes_discount_applied && (
          <span
            className="font-display text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(109,40,217,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }}
          >
            Scribes −50%
          </span>
        )}
        {Object.keys(cost.school_discounts_applied).map(s => (
          <span
            key={s}
            className="font-display text-[10px] px-1.5 py-0.5 rounded capitalize"
            style={{ background: 'rgba(6,78,59,0.35)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            {s} −{cost.school_discounts_applied[s]}%
          </span>
        ))}
        {cost.spell_entries.length > 0 && (
          <button
            onClick={() => setShowBreakdown(v => !v)}
            className="font-display text-[10px] text-smoke-400 hover:text-parchment-300 transition-colors ml-auto"
          >
            {showBreakdown ? '▴ hide' : '▾ breakdown'}
          </button>
        )}
      </div>

      {/* Per-spell breakdown (collapsible) */}
      {showBreakdown && (
        <div className="mt-3 border-t border-smoke-800/50 pt-3 space-y-1">
          {cost.spell_entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 font-body text-sm">
              <span className="flex-1 text-parchment-300 truncate">{entry.name}</span>
              <span className="text-smoke-500 capitalize text-xs w-20 shrink-0">{entry.school}</span>
              <span className="text-gold-400 w-16 text-right shrink-0">{entry.gold_cost} gp</span>
              <span className="text-smoke-400 w-12 text-right shrink-0">{entry.time_hours} hr</span>
              {entry.discount_pct > 0 && (
                <span
                  className="font-display text-[9px] px-1 rounded shrink-0"
                  style={{ background: 'rgba(109,40,217,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  −{entry.discount_pct}%
                </span>
              )}
            </div>
          ))}
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
  const updateSlots = useUpdateSpellSlots(linkedCharacter?.id ?? '');
  const resetSlots  = useResetSpellSlots(linkedCharacter?.id ?? '');

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
    spellcasting_ability_modifier: 3,
  });

  // Filter / sort
  const [searchFilter,       setSearchFilter]       = useState('');
  const [levelFilter,        setLevelFilter]        = useState<number[]>([]);
  const [schoolsFilter,      setSchoolsFilter]      = useState<string[]>([]);
  const [classFilter,        setClassFilter]        = useState<string[]>([]);
  const [damageTypeFilter,   setDamageTypeFilter]   = useState<string[]>([]);
  const [tagFilter,          setTagFilter]          = useState<string[]>([]);
  const [sourceFilter,       setSourceFilter]       = useState<string[]>([]);
  const [preparedOnly,       setPreparedOnly]       = useState(false);
  const [concentrationFilter,setConcentrationFilter]= useState(false);
  const [isAttackRollFilter, setIsAttackRollFilter] = useState(false);
  const [isSavingThrowFilter,setIsSavingThrowFilter]= useState(false);
  const [hasVFilter,         setHasVFilter]         = useState(false);
  const [hasSFilter,         setHasSFilter]         = useState(false);
  const [hasMFilter,         setHasMFilter]         = useState(false);
  const [sortBy,             setSortBy]             = useState<'level' | 'name' | 'school'>('level');
  const [sortDir,            setSortDir]            = useState<'asc' | 'desc'>('asc');

  const { data: sourcesData } = useSpellSources();

  // Misc
  const [isAddSpellOpen, setIsAddSpellOpen] = useState(false);
  const [updatingIds,    setUpdatingIds]    = useState<Set<string>>(new Set());

  // Sync damage context from linked character when it loads
  useEffect(() => {
    if (!linkedCharacter) return;
    setDamageContext(prev => ({
      ...prev,
      caster_attack_bonus: linkedCharacter.spell_attack_bonus,
      spell_save_dc: linkedCharacter.spell_save_dc,
      spellcasting_ability_modifier: linkedCharacter.spellcasting_ability_modifier,
    }));
  }, [linkedCharacter?.id]);

  // ── Derived data ────────────────────────────────────────────────────────

  const preparedSpells = spellbook?.prepared_spells ?? [];

  const filteredAndSorted = useMemo(() => {
    let list = [...preparedSpells];
    const q = searchFilter.trim().toLowerCase();
    if (q)                       list = list.filter(ps => ps.spell.name.toLowerCase().includes(q));
    if (levelFilter.length > 0)  list = list.filter(ps => levelFilter.includes(ps.spell.level));
    if (schoolsFilter.length > 0) list = list.filter(ps => schoolsFilter.includes(ps.spell.school));
    if (classFilter.length > 0)  list = list.filter(ps => ps.spell.classes?.some(c => classFilter.includes(c)));
    if (damageTypeFilter.length > 0) list = list.filter(ps =>
      ps.spell.damage_components?.some(dc => damageTypeFilter.includes(dc.damage_type ?? '')));
    if (tagFilter.length > 0)    list = list.filter(ps => ps.spell.tags?.some(t => tagFilter.includes(t)));
    if (sourceFilter.length > 0) list = list.filter(ps => ps.spell.source ? sourceFilter.includes(ps.spell.source) : false);
    if (preparedOnly)            list = list.filter(ps => ps.prepared);
    if (concentrationFilter)     list = list.filter(ps => ps.spell.concentration);
    if (isAttackRollFilter)      list = list.filter(ps => ps.spell.is_attack_roll);
    if (isSavingThrowFilter)     list = list.filter(ps => ps.spell.is_saving_throw);
    if (hasVFilter)              list = list.filter(ps => ps.spell.components_v);
    if (hasSFilter)              list = list.filter(ps => ps.spell.components_s);
    if (hasMFilter)              list = list.filter(ps => ps.spell.components_m);

    list.sort((a, b) => {
      let cmp = 0;
      if      (sortBy === 'level')  cmp = a.spell.level - b.spell.level;
      else if (sortBy === 'name')   cmp = a.spell.name.localeCompare(b.spell.name);
      else if (sortBy === 'school') cmp = a.spell.school.localeCompare(b.spell.school);
      if (cmp === 0) cmp = a.spell.name.localeCompare(b.spell.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [preparedSpells, searchFilter, levelFilter, schoolsFilter, classFilter, damageTypeFilter,
      tagFilter, sourceFilter, preparedOnly, concentrationFilter, isAttackRollFilter,
      isSavingThrowFilter, hasVFilter, hasSFilter, hasMFilter, sortBy, sortDir]);

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
  const isFiltered = !!(searchFilter || levelFilter.length > 0 || schoolsFilter.length > 0 ||
    classFilter.length > 0 || damageTypeFilter.length > 0 || tagFilter.length > 0 ||
    sourceFilter.length > 0 || preparedOnly || concentrationFilter || isAttackRollFilter ||
    isSavingThrowFilter || hasVFilter || hasSFilter || hasMFilter ||
    sortBy !== 'level' || sortDir !== 'asc');

  // Slots available per level (index 0 = level 1) for the linked character
  const slotsAvailable = useMemo(() => {
    if (!linkedCharacter) return [];
    const cls = linkedCharacter.character_class;
    const lvl = linkedCharacter.character_level;
    if (!cls || !lvl) return [];
    const maxSlots = getSpellSlots(cls, lvl) ?? [];
    return maxSlots.map((max, i) => Math.max(0, max - (linkedCharacter.spell_slots_used?.[i] ?? 0)));
  }, [linkedCharacter]);

  const handleCastSpell = (spellLevel: number) => {
    if (!linkedCharacter || spellLevel === 0) return;
    const cls = linkedCharacter.character_class;
    const lvl = linkedCharacter.character_level;
    if (!cls || !lvl) return;
    const maxSlots = getSpellSlots(cls, lvl) ?? [];
    const current = linkedCharacter.spell_slots_used?.slice() ?? Array(9).fill(0);
    const maxAtLevel = maxSlots[spellLevel - 1] ?? 0;
    if (current[spellLevel - 1] >= maxAtLevel) return; // no slots left
    current[spellLevel - 1] = current[spellLevel - 1] + 1;
    updateSlots.mutate(current);
  };

  // Damage spells eligible for comparison
  const damageSpells = useMemo(() => {
    return preparedSpells.filter(
      ps =>
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
    setLevelFilter([]);
    setSchoolsFilter([]);
    setClassFilter([]);
    setDamageTypeFilter([]);
    setTagFilter([]);
    setSourceFilter([]);
    setPreparedOnly(false);
    setConcentrationFilter(false);
    setIsAttackRollFilter(false);
    setIsSavingThrowFilter(false);
    setHasVFilter(false);
    setHasSFilter(false);
    setHasMFilter(false);
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
    <div>
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

        {/* Spell Slots */}
        {(() => {
          const cls = linkedCharacter?.character_class || spellbook.character_class;
          const lvl = linkedCharacter?.character_level || spellbook.character_level;
          if (!cls || !lvl) return null;
          return (
            <SpellSlotsPanel
              characterClass={cls}
              characterLevel={lvl}
              slotsUsed={linkedCharacter?.spell_slots_used}
              onToggle={linkedCharacter ? (levelIdx, newUsed) => {
                const current = linkedCharacter.spell_slots_used?.slice() ?? Array(9).fill(0);
                current[levelIdx] = newUsed;
                updateSlots.mutate(current);
              } : undefined}
              onReset={linkedCharacter ? () => resetSlots.mutate() : undefined}
            />
          );
        })()}
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

      {/* ── Filter sidebar + spell grid ─────────────────────────── */}
      {preparedSpells.length === 0 ? (
        <EmptyState
          icon="📖"
          title="No Spells Yet"
          description="Add spells to your spellbook to begin your arcane collection."
          action={{ label: 'Add Your First Spell', onClick: () => setIsAddSpellOpen(true) }}
        />
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">

          {/* Filter Sidebar */}
          <aside className="lg:w-64 xl:w-72 shrink-0">
            <div
              className="rounded-xl p-4 lg:sticky lg:top-6"
              style={{ background: 'linear-gradient(160deg, #0d0720 0%, #0f0a1e 100%)', border: '1px solid rgba(109,40,217,0.2)', borderLeft: '3px solid rgba(109,40,217,0.55)' }}
            >
              <p className="font-display uppercase tracking-[0.25em] text-[10px] text-arcane-800 mb-3">✦ Filter Grimoire</p>
              <div className="space-y-3">
                {/* Search */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Search</label>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="dnd-input font-body text-sm py-1.5"
                    placeholder="Spell name…"
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Level</label>
                  <MultiSelect
                    id="sb-level"
                    placeholder="All Levels"
                    options={[
                      { value: '0', label: 'Cantrip' },
                      ...[1,2,3,4,5,6,7,8,9].map(l => ({ value: String(l), label: `Level ${l}` })),
                    ]}
                    value={levelFilter.map(String)}
                    onChange={vals => setLevelFilter(vals.map(Number))}
                  />
                </div>

                {/* School */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">School</label>
                  <MultiSelect
                    id="sb-school"
                    placeholder="All Schools"
                    options={SPELL_SCHOOLS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                    value={schoolsFilter}
                    onChange={setSchoolsFilter}
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Class</label>
                  <MultiSelect
                    id="sb-class"
                    placeholder="All Classes"
                    options={DND_CLASSES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                    value={classFilter}
                    onChange={setClassFilter}
                  />
                </div>

                {/* Damage Type */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Damage Type</label>
                  <MultiSelect
                    id="sb-damage"
                    placeholder="All Types"
                    options={DAMAGE_TYPES.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
                    value={damageTypeFilter}
                    onChange={setDamageTypeFilter}
                  />
                </div>

                {/* Tag */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Tag</label>
                  <MultiSelect
                    id="sb-tag"
                    placeholder="All Tags"
                    options={SPELL_TAGS.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))}
                    value={tagFilter}
                    onChange={setTagFilter}
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Source</label>
                  <MultiSelect
                    id="sb-source"
                    placeholder="All Sources"
                    options={(sourcesData ?? []).map(s => ({ value: s, label: s }))}
                    value={sourceFilter}
                    onChange={setSourceFilter}
                  />
                </div>

                {/* Properties */}
                <div>
                  <p className="text-xs font-display font-medium text-parchment-300 mb-1.5">Properties</p>
                  <div className="space-y-1.5">
                    {([
                      { key: 'concentration', label: 'Concentration', value: concentrationFilter, set: setConcentrationFilter },
                      { key: 'attack',        label: 'Attack Roll',   value: isAttackRollFilter,  set: setIsAttackRollFilter  },
                      { key: 'save',          label: 'Saving Throw',  value: isSavingThrowFilter, set: setIsSavingThrowFilter  },
                      { key: 'prepared',      label: '★ Prepared only', value: preparedOnly,      set: setPreparedOnly         },
                    ] as const).map(({ key, label, value, set }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e => (set as (v: boolean) => void)(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-smoke-600 bg-stone-950 accent-gold-500 cursor-pointer"
                        />
                        <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-100 transition-colors">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Components */}
                <div>
                  <p className="text-xs font-display font-medium text-parchment-300 mb-1.5">Components</p>
                  <div className="flex gap-4">
                    {([
                      { key: 'v', label: 'V', value: hasVFilter, set: setHasVFilter },
                      { key: 's', label: 'S', value: hasSFilter, set: setHasSFilter },
                      { key: 'm', label: 'M', value: hasMFilter, set: setHasMFilter },
                    ] as const).map(({ key, label, value, set }) => (
                      <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e => (set as (v: boolean) => void)(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-smoke-600 bg-stone-950 accent-gold-500 cursor-pointer"
                        />
                        <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-100 transition-colors">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-300 mb-1">Sort</label>
                  <select
                    value={`${sortBy}-${sortDir}`}
                    onChange={e => handleSortChange(e.target.value)}
                    className="dnd-input font-body text-sm py-1.5 w-full"
                  >
                    <option value="level-asc">Level ↑</option>
                    <option value="level-desc">Level ↓</option>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                    <option value="school-asc">School A–Z</option>
                  </select>
                </div>

                {isFiltered && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="btn-secondary text-xs w-full py-1.5"
                  >
                    × Clear Filters
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main spell content */}
          <div className="flex-1 min-w-0">
            <div className="mb-3 font-body text-sm text-smoke-400">
              Showing {filteredAndSorted.length} of {preparedSpells.length} spell{preparedSpells.length !== 1 ? 's' : ''}
            </div>

            {filteredAndSorted.length === 0 ? (
              <p className="font-body text-smoke-400 text-center py-12">No spells match your filters.</p>
            ) : (
              <>
                {groupedByLevel.map(([level, spells]) => (
                  <LevelSection
                    key={level}
                    level={level}
                    preparedSpells={spells}
                    onTogglePrepared={handleTogglePrepared}
                    onRemove={handleRemoveSpell}
                    updatingIds={updatingIds}
                    isEditMode={isEditMode}
                    linkState={{
                      spellbookId: spellbook.id,
                      spellbookName: spellbook.name,
                      saveDC: linkedCharacter?.spell_save_dc,
                      atkBonus: linkedCharacter?.spell_attack_bonus,
                      spellcastingMod: linkedCharacter?.spellcasting_ability_modifier,
                    }}
                    onCast={linkedCharacter ? handleCastSpell : undefined}
                    slotsAvailable={linkedCharacter ? slotsAvailable : undefined}
                  />
                ))}
              </>
            )}
          </div>
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
