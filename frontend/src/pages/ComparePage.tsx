/**
 * Compare Page
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSpells } from '../hooks/useSpells';
import { useCompareSpells, useBreakevenAnalysis, useCompareGrowth } from '../hooks/useAnalysis';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { DamageComparisonChart } from '../components/DamageComparisonChart';
import { GrowthChart3D } from '../components/GrowthChart3D';
import { MultiSelect } from '../components/MultiSelect';
import { SPELL_SCHOOLS, DND_CLASSES, DAMAGE_TYPES } from '../constants/spellColors';
import type { AnalysisContext, Spell, BreakevenResponse, CompareGrowthResponse, CompareSpellsResponse } from '../types/api';

// ── Inline spell combobox ─────────────────────────────────────────────────────
interface SpellComboboxProps {
  label: string;
  accentClass: string;
  value: string;
  onChange: (id: string) => void;
  spells: Spell[];
}

function SpellCombobox({ label, accentClass, value, onChange, spells }: SpellComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = spells.find(s => s.id === value) ?? null;

  const filtered = query.trim()
    ? spells.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : spells;

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleSelect(spell: Spell) {
    onChange(spell.id);
    setQuery('');
    setOpen(false);
  }

  function handleClear() {
    onChange('');
    setQuery('');
  }

  const SCHOOL_COLORS: Record<string, string> = {
    evocation: '#f97316', conjuration: '#22c55e', abjuration: '#60a5fa',
    divination: '#a78bfa', enchantment: '#ec4899', illusion: '#14b8a6',
    necromancy: '#94a3b8', transmutation: '#d4af37',
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={`font-display text-xl font-semibold ${accentClass} mb-3 block`}>{label}</label>

      {selected && !open ? (
        // Selected state — show pill with clear
        <div className="dnd-input flex items-center justify-between gap-2 cursor-pointer"
             onClick={() => { setOpen(true); setQuery(''); }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-body text-parchment-100 truncate">{selected.name}</span>
            <span className="font-display text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: '#94a3b8', background: '#1e2335', border: '1px solid #2d3555' }}>
              {selected.level === 0 ? 'Cantrip' : `Lvl ${selected.level}`}
            </span>
            <span className="font-display text-[10px] px-1.5 py-0.5 rounded capitalize shrink-0"
                  style={{ color: SCHOOL_COLORS[selected.school] ?? '#c4a882', background: '#1e1e2e', border: '1px solid #2d3555' }}>
              {selected.school}
            </span>
          </div>
          <button onClick={e => { e.stopPropagation(); handleClear(); }}
                  className="text-smoke-400 hover:text-smoke-200 shrink-0 text-lg leading-none" aria-label="Clear">
            ×
          </button>
        </div>
      ) : (
        // Search input
        <input
          type="text"
          value={query}
          autoFocus={open}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search spells…"
          className="dnd-input font-body w-full"
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 max-h-72 overflow-y-auto rounded-lg border border-smoke-600 bg-smoke-900 shadow-2xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 font-body text-sm text-smoke-400">No spells found</div>
          ) : (
            filtered.map(spell => (
              <button
                key={spell.id}
                onPointerDown={e => { e.preventDefault(); handleSelect(spell); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-smoke-700 transition-colors"
              >
                <span className="font-body text-sm text-parchment-200 flex-1 truncate">{spell.name}</span>
                <span className="font-display text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: '#94a3b8', background: '#1e2335', border: '1px solid #2d3555' }}>
                  {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                </span>
                <span className="font-display text-[10px] px-1.5 py-0.5 rounded capitalize shrink-0"
                      style={{ color: SCHOOL_COLORS[spell.school] ?? '#c4a882', background: '#1e1e2e', border: '1px solid #2d3555' }}>
                  {spell.school}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Spell filter bar (compact, per-picker) ───────────────────────────────────
interface SpellFilter {
  schools: string[];
  classes: string[];
  levels: string[];
  damageTypes: string[];
  concentration: boolean;
}

const EMPTY_FILTER: SpellFilter = { schools: [], classes: [], levels: [], damageTypes: [], concentration: false };

function applySpellFilter(spells: Spell[], filter: SpellFilter, query: string): Spell[] {
  const q = query.toLowerCase();
  return spells.filter((s) => {
    if (filter.schools.length > 0 && !filter.schools.includes(s.school)) return false;
    if (filter.classes.length > 0 && s.classes && s.classes.length > 0 && !filter.classes.some((c) => s.classes!.includes(c))) return false;
    if (filter.levels.length > 0 && !filter.levels.includes(String(s.level))) return false;
    if (filter.damageTypes.length > 0) {
      const types = s.damage_components?.map((dc) => dc.damage_type) ?? [];
      if (!filter.damageTypes.some((dt) => types.includes(dt))) return false;
    }
    if (filter.concentration && !s.concentration) return false;
    if (q && !s.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

interface SpellFilterBarProps {
  filter: SpellFilter;
  onChange: (f: SpellFilter) => void;
}

function SpellFilterBar({ filter, onChange }: SpellFilterBarProps) {
  const set = <K extends keyof SpellFilter>(key: K, val: SpellFilter[K]) =>
    onChange({ ...filter, [key]: val });

  const levelOptions = [
    { value: '0', label: 'Cantrip' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => ({ value: String(l), label: `Level ${l}` })),
  ];
  const schoolOptions = SPELL_SCHOOLS.map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  }));
  const classOptions = DND_CLASSES.map((c) => ({
    value: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
  }));
  const dmgOptions = DAMAGE_TYPES.map((d) => ({
    value: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
  }));

  const active =
    filter.schools.length + filter.classes.length + filter.levels.length + filter.damageTypes.length + (filter.concentration ? 1 : 0);

  return (
    <div className="mt-3 p-3 rounded-lg bg-smoke-800/60 border border-smoke-700 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-xs text-smoke-400 uppercase tracking-wider">Filter spells</span>
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="font-body text-xs text-smoke-500 hover:text-smoke-300"
          >
            Clear ({active})
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MultiSelect placeholder="All Levels" options={levelOptions} value={filter.levels}
          onChange={(v) => set('levels', v)} />
        <MultiSelect placeholder="All Schools" options={schoolOptions} value={filter.schools}
          onChange={(v) => set('schools', v)} />
        <MultiSelect placeholder="All Classes" options={classOptions} value={filter.classes}
          onChange={(v) => set('classes', v)} />
        <MultiSelect placeholder="All Damage Types" options={dmgOptions} value={filter.damageTypes}
          onChange={(v) => set('damageTypes', v)} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filter.concentration}
          onChange={(e) => set('concentration', e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-gold-500"
        />
        <span className="font-body text-xs text-smoke-400">Concentration only</span>
      </label>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ComparePage() {
  const [searchParams] = useSearchParams();
  const initialSpell1 = searchParams.get('spell1') || '';
  const initialSpell2 = searchParams.get('spell2') || '';

  const [spell1Id, setSpell1Id] = useState(initialSpell1);
  const [spell2Id, setSpell2Id] = useState(initialSpell2);
  const [context, setContext] = useState<AnalysisContext>({
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
  const [filterA, setFilterA] = useState<SpellFilter>(EMPTY_FILTER);
  const [filterB, setFilterB] = useState<SpellFilter>(EMPTY_FILTER);
  // Per-spell overrides: number_of_targets and resistance can differ per spell
  const [overridesA, setOverridesA] = useState<{ number_of_targets: number; resistance: boolean }>({ number_of_targets: 1, resistance: false });
  const [overridesB, setOverridesB] = useState<{ number_of_targets: number; resistance: boolean }>({ number_of_targets: 1, resistance: false });

  const { data: allSpellsResponse } = useSpells({ page: 1, page_size: 1000 });
  const compareSpells = useCompareSpells();
  const breakeven = useBreakevenAnalysis();
  const growthAnalysis = useCompareGrowth();

  const allSpells = allSpellsResponse?.results || [];
  const filteredSpellsA = useMemo(() => applySpellFilter(allSpells, filterA, ''), [allSpells, filterA]);
  const filteredSpellsB = useMemo(() => applySpellFilter(allSpells, filterB, ''), [allSpells, filterB]);
  const spell1 = allSpells.find((s) => s.id === spell1Id);
  const spell2 = allSpells.find((s) => s.id === spell2Id);

  const isAnalyzing = compareSpells.isPending || breakeven.isPending || growthAnalysis.isPending;

  const handleAnalyze = async () => {
    if (!spell1Id || !spell2Id) return;
    const { spell_slot_level: _omit, ...growthContext } = context;
    await Promise.all([
      compareSpells.mutateAsync({ spellAId: spell1Id, spellBId: spell2Id, context, overridesA, overridesB }),
      breakeven.mutateAsync({ spell_a_id: spell1Id, spell_b_id: spell2Id, ...context }),
      growthAnalysis.mutateAsync({ spell_a_id: spell1Id, spell_b_id: spell2Id, ...growthContext }),
    ]);
  };

  const comparisonResult = compareSpells.data as CompareSpellsResponse | undefined;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="font-display uppercase tracking-[0.3em] text-[10px] text-crimson-700 mb-1.5">
          ✦ &nbsp; Arcane Scales &nbsp; ✦
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-wide text-gold-300">
          Compare Spells
        </h1>
        <div className="flex items-center gap-3 mt-3 select-none" aria-hidden="true">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(190,18,60,0.4))' }} />
          <span className="text-crimson-800 text-xs">✦</span>
          <div className="h-px w-12" style={{ background: 'rgba(190,18,60,0.2)' }} />
        </div>
      </div>

      {/* Spell Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Spell 1 */}
        <div className="rounded-xl p-6" style={{ background: 'linear-gradient(155deg, #0d0720 0%, #10082a 100%)', border: '1px solid rgba(109,40,217,0.25)', borderLeft: '3px solid rgba(109,40,217,0.65)' }}>
          <SpellCombobox
            label="🔮 Spell 1"
            accentClass="text-arcane-300"
            value={spell1Id}
            onChange={setSpell1Id}
            spells={filteredSpellsA}
          />
          {spell1 && (
            <div className="mt-4 p-4 bg-smoke-800 rounded-lg border border-smoke-700">
              <h3 className="font-display font-semibold text-parchment-100 mb-2">{spell1.name}</h3>
              <div className="font-body text-sm text-parchment-300 space-y-1">
                <p><span className="font-semibold text-smoke-300">Level:</span>{' '}{spell1.level === 0 ? 'Cantrip' : spell1.level}</p>
                <p><span className="font-semibold text-smoke-300">School:</span>{' '}{spell1.school.charAt(0).toUpperCase() + spell1.school.slice(1)}</p>
                <p><span className="font-semibold text-smoke-300">Type:</span>{' '}{spell1.is_attack_roll ? 'Attack Roll' : spell1.is_saving_throw ? 'Saving Throw' : 'Other'}</p>
                {spell1.damage_components && spell1.damage_components.length > 0 && (
                  <p><span className="font-semibold text-smoke-300">Damage:</span>{' '}{spell1.damage_components.map((dc) => `${dc.dice_count}d${dc.die_size} ${dc.damage_type}`).join(', ')}</p>
                )}
              </div>
              {/* Per-spell overrides */}
              <div className="mt-3 pt-3 border-t border-smoke-700 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-400 mb-1">Enemies</label>
                  <input
                    type="number"
                    value={overridesA.number_of_targets}
                    onChange={(e) => setOverridesA((o) => ({ ...o, number_of_targets: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="dnd-input font-body text-sm py-1"
                    min="1" max="20"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overridesA.resistance}
                      onChange={(e) => setOverridesA((o) => ({ ...o, resistance: e.target.checked }))}
                      className="w-4 h-4 rounded accent-gold-500"
                    />
                    <span className="font-body text-xs text-parchment-400">Has Resistance</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          <SpellFilterBar filter={filterA} onChange={setFilterA} />
        </div>

        {/* Spell 2 */}
        <div className="rounded-xl p-6" style={{ background: 'linear-gradient(155deg, #130408 0%, #1a0510 100%)', border: '1px solid rgba(190,18,60,0.25)', borderLeft: '3px solid rgba(190,18,60,0.65)' }}>
          <SpellCombobox
            label="⚡ Spell 2"
            accentClass="text-crimson-300"
            value={spell2Id}
            onChange={setSpell2Id}
            spells={filteredSpellsB}
          />
          {spell2 && (
            <div className="mt-4 p-4 bg-smoke-800 rounded-lg border border-smoke-700">
              <h3 className="font-display font-semibold text-parchment-100 mb-2">{spell2.name}</h3>
              <div className="font-body text-sm text-parchment-300 space-y-1">
                <p><span className="font-semibold text-smoke-300">Level:</span>{' '}{spell2.level === 0 ? 'Cantrip' : spell2.level}</p>
                <p><span className="font-semibold text-smoke-300">School:</span>{' '}{spell2.school.charAt(0).toUpperCase() + spell2.school.slice(1)}</p>
                <p><span className="font-semibold text-smoke-300">Type:</span>{' '}{spell2.is_attack_roll ? 'Attack Roll' : spell2.is_saving_throw ? 'Saving Throw' : 'Other'}</p>
                {spell2.damage_components && spell2.damage_components.length > 0 && (
                  <p><span className="font-semibold text-smoke-300">Damage:</span>{' '}{spell2.damage_components.map((dc) => `${dc.dice_count}d${dc.die_size} ${dc.damage_type}`).join(', ')}</p>
                )}
              </div>
              {/* Per-spell overrides */}
              <div className="mt-3 pt-3 border-t border-smoke-700 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-medium text-parchment-400 mb-1">Enemies</label>
                  <input
                    type="number"
                    value={overridesB.number_of_targets}
                    onChange={(e) => setOverridesB((o) => ({ ...o, number_of_targets: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="dnd-input font-body text-sm py-1"
                    min="1" max="20"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overridesB.resistance}
                      onChange={(e) => setOverridesB((o) => ({ ...o, resistance: e.target.checked }))}
                      className="w-4 h-4 rounded accent-gold-500"
                    />
                    <span className="font-body text-xs text-parchment-400">Has Resistance</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          <SpellFilterBar filter={filterB} onChange={setFilterB} />
        </div>
      </div>

      {/* Analyze Button */}
      <div className="mb-6">
        <button
          onClick={handleAnalyze}
          disabled={!spell1Id || !spell2Id || isAnalyzing}
          className="btn-gold w-full py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? '🔮 Invoking the arcane scales…' : '🔮 Analyze'}
        </button>
      </div>

      {/* Error Display */}
      {(compareSpells.isError || breakeven.isError || growthAnalysis.isError) && (
        <div className="dnd-card border-l-4 border-crimson-700 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-crimson-400 mb-2">Error</h2>
          <p className="font-body text-parchment-400">Analysis failed. Please check your spell selections and try again.</p>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="dnd-card p-6 mb-6">
          <h2 className="font-display text-2xl font-bold text-gold-300 mb-6">Comparison Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Spell A Results */}
            <div className={`dnd-card p-6 border-2 ${
              comparisonResult.winner === 'spell_a' ? 'border-gold-500' : 'border-smoke-600'
            }`}>
              <h3 className="font-display text-xl font-semibold text-parchment-100 mb-4 flex items-center gap-2">
                {comparisonResult.spell_a.name}
                {comparisonResult.winner === 'spell_a' && (
                  <span className="font-display text-xs px-2 py-1 rounded"
                        style={{ background: '#451a03', color: '#fbbf24', border: '1px solid #b45309' }}>
                    👑 Winner
                  </span>
                )}
              </h3>
              <div className="font-body space-y-3">
                <div className="flex justify-between">
                  <span className="text-smoke-400">Level:</span>
                  <span className="text-parchment-200 font-medium">
                    {comparisonResult.spell_a.level === 0 ? 'Cantrip' : comparisonResult.spell_a.level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke-400">Expected Damage:</span>
                  <span className="font-display text-lg font-bold text-gold-400">
                    {comparisonResult.spell_a.expected_damage.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke-400">Efficiency:</span>
                  <span className="text-parchment-200 font-medium">
                    {comparisonResult.spell_a.efficiency.toFixed(2)}
                    <span className="text-smoke-500 text-xs ml-1">dmg/slot</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Spell B Results */}
            <div className={`dnd-card p-6 border-2 ${
              comparisonResult.winner === 'spell_b' ? 'border-gold-500' : 'border-smoke-600'
            }`}>
              <h3 className="font-display text-xl font-semibold text-parchment-100 mb-4 flex items-center gap-2">
                {comparisonResult.spell_b.name}
                {comparisonResult.winner === 'spell_b' && (
                  <span className="font-display text-xs px-2 py-1 rounded"
                        style={{ background: '#451a03', color: '#fbbf24', border: '1px solid #b45309' }}>
                    👑 Winner
                  </span>
                )}
              </h3>
              <div className="font-body space-y-3">
                <div className="flex justify-between">
                  <span className="text-smoke-400">Level:</span>
                  <span className="text-parchment-200 font-medium">
                    {comparisonResult.spell_b.level === 0 ? 'Cantrip' : comparisonResult.spell_b.level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke-400">Expected Damage:</span>
                  <span className="font-display text-lg font-bold text-gold-400">
                    {comparisonResult.spell_b.expected_damage.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-smoke-400">Efficiency:</span>
                  <span className="text-parchment-200 font-medium">
                    {comparisonResult.spell_b.efficiency.toFixed(2)}
                    <span className="text-smoke-500 text-xs ml-1">dmg/slot</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Damage Difference */}
          <div className="mb-6 p-4 bg-smoke-800 rounded-lg border border-smoke-700 text-center">
            <span className="font-display text-sm text-smoke-400">Damage Difference: </span>
            <span className="font-display text-lg font-bold text-gold-400">
              {comparisonResult.damage_difference.toFixed(2)}
            </span>
            <span className="font-body text-sm text-smoke-400 ml-2">
              in favour of {comparisonResult.winner === 'spell_a' ? comparisonResult.spell_a.name : comparisonResult.spell_b.name}
            </span>
          </div>

          <DamageComparisonChart compareData={comparisonResult} growthData={growthAnalysis.data} />
        </div>
      )}

      {/* Breakeven Results */}
      {breakeven.data && (
        <BreakevenResults
          result={breakeven.data}
          context={context}
          spells={[spell1, spell2].filter((s): s is Spell => s !== undefined)}
          onContextChange={setContext}
          onReanalyze={handleAnalyze}
        />
      )}

      {/* Growth Results */}
      {growthAnalysis.data && <GrowthResults result={growthAnalysis.data} />}
    </div>
  );
}

// ── Breakeven results component ───────────────────────────────────────────────
interface BreakevenResultsProps {
  result: BreakevenResponse;
  context: AnalysisContext;
  spells: Spell[];
  onContextChange: (ctx: AnalysisContext) => void;
  onReanalyze: () => void;
}
function BreakevenResults({ result, context, spells, onContextChange, onReanalyze }: BreakevenResultsProps) {
  const spellAColor = '#818cf8'; // arcane-400
  const spellBColor = '#f87171'; // crimson-400

  const acData = result.ac_profile.map((p) => ({
    ac: p.value,
    [result.spell_a.name]: parseFloat(p.spell_a_damage.toFixed(2)),
    [result.spell_b.name]: parseFloat(p.spell_b_damage.toFixed(2)),
  }));

  const saveData = result.save_profile.map((p) => ({
    save: p.value,
    [result.spell_a.name]: parseFloat(p.spell_a_damage.toFixed(2)),
    [result.spell_b.name]: parseFloat(p.spell_b_damage.toFixed(2)),
  }));

  return (
    <div className="dnd-card p-6 mt-6">
      <h2 className="font-display text-2xl font-bold text-gold-300 mb-6">Breakeven Analysis</h2>

      {/* Combat Parameters */}
      <div className="mb-6 p-4 bg-smoke-800 rounded-lg border border-smoke-700">
        <AnalysisContextForm context={context} onChange={onContextChange} spells={spells} />
        <div className="mt-4 text-right">
          <button onClick={onReanalyze} className="btn-gold px-6 py-2">🔮 Re-analyze</button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="px-4 py-3 rounded-lg border border-arcane-700 bg-smoke-800 text-center min-w-[140px]">
          <div className="font-display text-xs text-smoke-400 uppercase tracking-wider mb-1">Breakeven AC</div>
          <div className="font-display text-2xl font-bold text-arcane-300">
            {result.breakeven_ac !== null ? result.breakeven_ac : '—'}
          </div>
          {result.breakeven_ac === null && (
            <div className="font-body text-xs text-smoke-500 mt-1">No crossover</div>
          )}
        </div>
        <div className="px-4 py-3 rounded-lg border border-crimson-700 bg-smoke-800 text-center min-w-[160px]">
          <div className="font-display text-xs text-smoke-400 uppercase tracking-wider mb-1">Breakeven Save Bonus</div>
          <div className="font-display text-2xl font-bold text-crimson-300">
            {result.breakeven_save_bonus !== null
              ? (result.breakeven_save_bonus >= 0 ? `+${result.breakeven_save_bonus}` : result.breakeven_save_bonus)
              : '—'}
          </div>
          {result.breakeven_save_bonus === null && (
            <div className="font-body text-xs text-smoke-500 mt-1">No crossover</div>
          )}
        </div>
      </div>

      {/* AC sweep chart */}
      <div className="mb-8">
        <h3 className="font-display text-lg font-semibold text-parchment-200 mb-3">
          Damage vs. Target AC
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={acData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3555" />
            <XAxis dataKey="ac" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} label={{ value: 'Target AC', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 12 }} />
            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #2d3555', borderRadius: 6 }} labelStyle={{ color: '#c4a882' }} itemStyle={{ color: '#e2d9c8' }} formatter={(v) => typeof v === 'number' ? v.toFixed(2) : ''} />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 8 }} />
            {result.breakeven_ac !== null && (
              <ReferenceLine x={result.breakeven_ac} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: `Breakeven: ${result.breakeven_ac}`, fill: '#fbbf24', fontSize: 11 }} />
            )}
            <Line type="monotone" dataKey={result.spell_a.name} stroke={spellAColor} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey={result.spell_b.name} stroke={spellBColor} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Save bonus sweep chart */}
      <div>
        <h3 className="font-display text-lg font-semibold text-parchment-200 mb-3">
          Damage vs. Target Save Bonus
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={saveData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3555" />
            <XAxis dataKey="save" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} label={{ value: 'Target Save Bonus', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 12 }} />
            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #2d3555', borderRadius: 6 }} labelStyle={{ color: '#c4a882' }} itemStyle={{ color: '#e2d9c8' }} formatter={(v) => typeof v === 'number' ? v.toFixed(2) : ''} />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 8 }} />
            {result.breakeven_save_bonus !== null && (
              <ReferenceLine x={result.breakeven_save_bonus} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: `Breakeven: ${result.breakeven_save_bonus >= 0 ? '+' : ''}${result.breakeven_save_bonus}`, fill: '#fbbf24', fontSize: 11 }} />
            )}
            <Line type="monotone" dataKey={result.spell_a.name} stroke={spellAColor} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey={result.spell_b.name} stroke={spellBColor} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Growth results component ──────────────────────────────────────────────────
function GrowthResults({ result }: { result: CompareGrowthResponse }) {
  const colorA = '#818cf8'; // arcane-400
  const colorB = '#f87171'; // crimson-400
  const [show3D, setShow3D] = useState(false);

  const isCantrip = (level: number) => level === 0;
  const eitherCantrip = isCantrip(result.spell_a.level) || isCantrip(result.spell_b.level);

  // Map profile → chart-friendly objects keyed by spell name for Recharts
  const profileData = result.profile.map((p) => ({
    x: p.x,
    label: p.label,
    [result.spell_a.name]: parseFloat(p.spell_a_damage.toFixed(2)),
    [result.spell_b.name]: parseFloat(p.spell_b_damage.toFixed(2)),
  }));

  const xAxisLabel = eitherCantrip ? 'Character Level' : 'Character Level (highest available slot)';

  return (
    <div className="dnd-card p-6 mt-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h2 className="font-display text-2xl font-bold text-gold-300">Spell Growth Analysis</h2>
        <button
          onClick={() => setShow3D((v) => !v)}
          className="btn-secondary text-sm px-3 py-1.5 shrink-0"
          title="Toggle 3D view — X: character level, Y: damage, Z: spell slot level"
        >
          {show3D ? '📊 2D View' : '🧊 3D View'}
        </button>
      </div>
      <p className="font-body text-sm text-smoke-400 mb-6">
        {eitherCantrip
          ? 'Cantrips scale by character level (×1/×2/×3/×4 at levels 1/5/11/17). Leveled spells are cast at the highest available full-caster slot for each character level.'
          : 'Both spells cast at the highest available full-caster slot for each character level.'}
      </p>

      {/* Crossover summary */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="px-4 py-3 rounded-lg border border-emerald-700 bg-smoke-800 text-center min-w-[200px]">
          <div className="font-display text-xs text-smoke-400 uppercase tracking-wider mb-1">
            Character-Level Crossover
          </div>
          <div className="font-display text-2xl font-bold text-emerald-300">
            {result.crossover_x !== null ? `Level ${result.crossover_x}` : '—'}
          </div>
          {result.crossover_x === null ? (
            <div className="font-body text-xs text-smoke-500 mt-1">No crossover in levels 1–20</div>
          ) : (
            <div className="font-body text-xs text-smoke-400 mt-1">
              {/* Find which spell takes over at the crossover level */}
              {(() => {
                const before = result.profile.find((p) => p.x === result.crossover_x! - 1);
                const at = result.profile.find((p) => p.x === result.crossover_x);
                if (!at) return null;
                const leader = at.spell_a_damage >= at.spell_b_damage ? result.spell_a.name : result.spell_b.name;
                const wasLeader = before
                  ? (before.spell_a_damage >= before.spell_b_damage ? result.spell_a.name : result.spell_b.name)
                  : null;
                if (leader !== wasLeader) {
                  return `${leader} takes the lead`;
                }
                return `${leader} ahead from here`;
              })()}
            </div>
          )}
        </div>

        {result.slot_profile.length > 0 && (
          <div className="px-4 py-3 rounded-lg border border-violet-700 bg-smoke-800 text-center min-w-[200px]">
            <div className="font-display text-xs text-smoke-400 uppercase tracking-wider mb-1">
              Slot-Level Crossover
            </div>
            <div className="font-display text-2xl font-bold text-violet-300">
              {result.slot_crossover !== null ? `Slot ${result.slot_crossover}` : '—'}
            </div>
            {result.slot_crossover === null && (
              <div className="font-body text-xs text-smoke-500 mt-1">No crossover across slots 1–9</div>
            )}
          </div>
        )}
      </div>

      {/* 3D chart */}
      {show3D && (
        <div className="mb-8">
          <h3 className="font-display text-lg font-semibold text-parchment-200 mb-1">
            3D Growth View
          </h3>
          <p className="font-body text-xs text-smoke-400 mb-3">
            X = character level · Y = spell slot level (0 = cantrip) · Z = expected damage.
            Drag to rotate, scroll to zoom.
          </p>
          <GrowthChart3D result={result} />
        </div>
      )}

      {/* Character-level progression chart + slot chart (hidden in 3D mode) */}
      {!show3D && (
        <>
          <div className="mb-8">
            <h3 className="font-display text-lg font-semibold text-parchment-200 mb-3">
              Damage by Character Level
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={profileData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3555" />
                <XAxis
                  dataKey="x"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  label={{ value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e1e2e', border: '1px solid #2d3555', borderRadius: 6 }}
                  labelStyle={{ color: '#c4a882' }}
                  itemStyle={{ color: '#e2d9c8' }}
                  formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : '')}
                  labelFormatter={(x) => {
                    const pt = profileData.find((p) => p.x === x);
                    return pt ? pt.label : `Level ${x}`;
                  }}
                />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 8 }} />
                {result.crossover_x !== null && (
                  <ReferenceLine
                    x={result.crossover_x}
                    stroke="#fbbf24"
                    strokeDasharray="4 4"
                    label={{ value: `Crossover: L${result.crossover_x}`, fill: '#fbbf24', fontSize: 11 }}
                  />
                )}
                {eitherCantrip && [5, 11, 17].map((lvl) => (
                  <ReferenceLine
                    key={lvl}
                    x={lvl}
                    stroke="#4ade80"
                    strokeDasharray="3 3"
                    strokeOpacity={0.55}
                    label={{ value: `Tier ${lvl === 5 ? 2 : lvl === 11 ? 3 : 4}`, position: 'top', fill: '#4ade80', fontSize: 10 }}
                  />
                ))}
                <Line type="monotone" dataKey={result.spell_a.name} stroke={colorA} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey={result.spell_b.name} stroke={colorB} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </>
      )}
    </div>
  );
}

export default ComparePage;
