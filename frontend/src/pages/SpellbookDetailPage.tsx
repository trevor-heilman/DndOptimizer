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
} from '../hooks/useSpellbooks';
import { getSchoolColors } from '../constants/spellColors';
import { AddSpellPicker } from '../components/AddSpellPicker';
import { LoadingSpinner, AlertMessage, EmptyState } from '../components/ui';
import type { PreparedSpell, Spell } from '../types/api';

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
}

function PreparedSpellRow({
  ps, onTogglePrepared, onRemove, isUpdating, isEditMode,
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
}

function LevelSection({
  level, preparedSpells, onTogglePrepared, onRemove, updatingIds, isEditMode,
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
            />
          ))}
        </div>
      )}
      {!open && <div className="mb-4" />}
    </section>
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

  // Edit mode
  const [isEditMode,        setIsEditMode]        = useState(false);
  const [editedName,        setEditedName]        = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedClass,       setEditedClass]       = useState('');

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
    setEditedClass(spellbook.character_class ?? '');
    setIsEditMode(true);
  };

  const handleDoneEdit = async () => {
    const updates: Record<string, string> = {};
    if (editedName.trim() && editedName.trim() !== spellbook.name)
      updates.name = editedName.trim();
    if (editedDescription !== (spellbook.description ?? ''))
      updates.description = editedDescription.trim();
    if (editedClass !== (spellbook.character_class ?? ''))
      updates.character_class = editedClass;
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

        {/* Class selector — edit mode */}
        {isEditMode && (
          <div className="mt-3 flex items-center gap-3">
            <label className="font-display text-xs uppercase tracking-widest text-smoke-400">
              Class
            </label>
            <select
              value={editedClass}
              onChange={e => setEditedClass(e.target.value)}
              className="dnd-input font-body text-sm py-1 max-w-xs"
            >
              <option value="">— No class —</option>
              {CLASS_CHOICES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Class badge + stats — view mode */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {spellbook.character_class && (
            <span
              className="font-display text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ color: '#c4b5fd', background: '#2e1a5f55', border: '1px solid #5b21b6' }}
            >
              {spellbook.character_class}
            </span>
          )}
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
            />
          ))}
        </div>
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
