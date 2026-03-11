/**
 * Compare Page
 */
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSpells } from '../hooks/useSpells';
import { useCompareSpells, useBreakevenAnalysis } from '../hooks/useAnalysis';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { DamageComparisonChart } from '../components/DamageComparisonChart';
import type { AnalysisContext, Spell, BreakevenResponse } from '../types/api';

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

  const { data: allSpellsResponse } = useSpells({ page: 1, page_size: 1000 });
  const compareSpells = useCompareSpells();
  const breakeven = useBreakevenAnalysis();

  const allSpells = allSpellsResponse?.results || [];
  const spell1 = allSpells.find((s) => s.id === spell1Id);
  const spell2 = allSpells.find((s) => s.id === spell2Id);

  const handleCompare = async () => {
    if (!spell1Id || !spell2Id) return;
    await compareSpells.mutateAsync({ spellAId: spell1Id, spellBId: spell2Id, context });
  };

  const handleBreakeven = async () => {
    if (!spell1Id || !spell2Id) return;
    await breakeven.mutateAsync({ spell_a_id: spell1Id, spell_b_id: spell2Id, ...context });
  };

  const comparisonResult = compareSpells.data as any;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-gold-300 mb-6 flex items-center gap-2">
        <span aria-hidden="true">⚖️</span> Compare Spells
      </h1>

      {/* Spell Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Spell 1 */}
        <div className="dnd-card border-l-4 border-arcane-700 p-6">
          <SpellCombobox
            label="🔮 Spell 1"
            accentClass="text-arcane-300"
            value={spell1Id}
            onChange={setSpell1Id}
            spells={allSpells}
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
            </div>
          )}
        </div>

        {/* Spell 2 */}
        <div className="dnd-card border-l-4 border-crimson-700 p-6">
          <SpellCombobox
            label="⚡ Spell 2"
            accentClass="text-crimson-300"
            value={spell2Id}
            onChange={setSpell2Id}
            spells={allSpells}
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
            </div>
          )}
        </div>
      </div>

      {/* Analysis Context */}
      <div className="dnd-card p-6 mb-6">
        <AnalysisContextForm context={context} onChange={setContext} />
      </div>

      {/* Compare Button */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleCompare}
          disabled={!spell1Id || !spell2Id || compareSpells.isPending}
          className="btn-gold flex-1 py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {compareSpells.isPending ? 'Invoking the arcane scales…' : '⚖️ Compare Spells'}
        </button>
        <button
          onClick={handleBreakeven}
          disabled={!spell1Id || !spell2Id || breakeven.isPending}
          className="btn-secondary flex-1 py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#1e1438', color: '#c4b5fd', border: '1px solid #5b21b6' }}
        >
          {breakeven.isPending ? 'Calculating crossover…' : '📊 Find Breakeven Point'}
        </button>
      </div>

      {/* Error Display */}
      {compareSpells.isError && (
        <div className="dnd-card border-l-4 border-crimson-700 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-crimson-400 mb-2">Error</h2>
          <p className="font-body text-parchment-400">Failed to compare spells. Please try again.</p>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="dnd-card p-6">
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

          <DamageComparisonChart comparisonResult={comparisonResult} />
        </div>
      )}

      {/* Breakeven Error */}
      {breakeven.isError && (
        <div className="dnd-card border-l-4 border-crimson-700 p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-crimson-400 mb-2">Error</h2>
          <p className="font-body text-parchment-400">Failed to calculate breakeven. Please try again.</p>
        </div>
      )}

      {/* Breakeven Results */}
      {breakeven.data && <BreakevenResults result={breakeven.data} />}
    </div>
  );
}

// ── Breakeven results component ───────────────────────────────────────────────
function BreakevenResults({ result }: { result: BreakevenResponse }) {
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

export default ComparePage;
