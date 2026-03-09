/**
 * Compare Page
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSpells } from '../hooks/useSpells';
import { useCompareSpells } from '../hooks/useAnalysis';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { DamageComparisonChart } from '../components/DamageComparisonChart';
import type { AnalysisContext } from '../types/api';

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const initialSpell1 = searchParams.get('spell1') || '';
  const initialSpell2 = searchParams.get('spell2') || '';

  const [spell1Id, setSpell1Id] = useState(initialSpell1);
  const [spell2Id, setSpell2Id] = useState(initialSpell2);
  const [spell1Search, setSpell1Search] = useState('');
  const [spell2Search, setSpell2Search] = useState('');
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

  const allSpells = allSpellsResponse?.results || [];
  const filteredSpells1 = spell1Search
    ? allSpells.filter((s) => s.name.toLowerCase().includes(spell1Search.toLowerCase()))
    : allSpells;
  const filteredSpells2 = spell2Search
    ? allSpells.filter((s) => s.name.toLowerCase().includes(spell2Search.toLowerCase()))
    : allSpells;

  const spell1 = allSpells.find((s) => s.id === spell1Id);
  const spell2 = allSpells.find((s) => s.id === spell2Id);

  const handleCompare = async () => {
    if (!spell1Id || !spell2Id) {
      alert('Please select both spells to compare');
      return;
    }

    await compareSpells.mutateAsync({ spellAId: spell1Id, spellBId: spell2Id, context });
  };

  const comparisonResult = compareSpells.data as any;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-gold-300 mb-6 flex items-center gap-2">
        <span aria-hidden="true">⚖️</span> Compare Spells
      </h1>

      {/* Spell Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Spell 1 Selection */}
        <div className="dnd-card border-l-4 border-arcane-700 p-6">
          <h2 className="font-display text-xl font-semibold text-arcane-300 mb-4">🔮 Spell 1</h2>
          <div className="mb-3 space-y-2">
            <input
              type="text"
              value={spell1Search}
              onChange={(e) => setSpell1Search(e.target.value)}
              placeholder="Search spells…"
              className="dnd-input font-body"
            />
            <select
              value={spell1Id}
              onChange={(e) => setSpell1Id(e.target.value)}
              className="dnd-input font-body"
            >
              <option value="">Select a spell…</option>
              {filteredSpells1.slice(0, 50).map((spell) => (
                <option key={spell.id} value={spell.id}>
                  {spell.name} (Level {spell.level})
                </option>
              ))}
            </select>
          </div>

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

        {/* Spell 2 Selection */}
        <div className="dnd-card border-l-4 border-crimson-700 p-6">
          <h2 className="font-display text-xl font-semibold text-crimson-300 mb-4">⚡ Spell 2</h2>
          <div className="mb-3 space-y-2">
            <input
              type="text"
              value={spell2Search}
              onChange={(e) => setSpell2Search(e.target.value)}
              placeholder="Search spells…"
              className="dnd-input font-body"
            />
            <select
              value={spell2Id}
              onChange={(e) => setSpell2Id(e.target.value)}
              className="dnd-input font-body"
            >
              <option value="">Select a spell…</option>
              {filteredSpells2.slice(0, 50).map((spell) => (
                <option key={spell.id} value={spell.id}>
                  {spell.name} (Level {spell.level})
                </option>
              ))}
            </select>
          </div>

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
      <div className="mb-6">
        <button
          onClick={handleCompare}
          disabled={!spell1Id || !spell2Id || compareSpells.isPending}
          className="btn-gold w-full py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {compareSpells.isPending ? 'Invoking the arcane scales…' : '⚖️ Compare Spells'}
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
              comparisonResult.winner === 'spell_a' ? 'border-gold-500' :
              comparisonResult.winner === 'tie' ? 'border-arcane-500' : 'border-smoke-600'
            }`}>
              <h3 className="font-display text-xl font-semibold text-parchment-100 mb-4 flex items-center gap-2">
                {comparisonResult.spell_a.spell_name}
                {comparisonResult.winner === 'spell_a' && (
                  <span className="font-display text-xs px-2 py-1 rounded"
                        style={{ background: '#451a03', color: '#fbbf24', border: '1px solid #b45309' }}>
                    👑 Winner
                  </span>
                )}
              </h3>
              <div className="font-body space-y-3">
                {[
                  { label: 'Type', value: comparisonResult.spell_a.spell_type.replace('_', ' ') },
                  { label: 'Average Damage', value: comparisonResult.spell_a.average_damage.toFixed(2) },
                  { label: 'Min – Max', value: `${comparisonResult.spell_a.minimum_damage} – ${comparisonResult.spell_a.maximum_damage}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-smoke-400">{label}:</span>
                    <span className="text-parchment-200 font-medium capitalize">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-smoke-400">Expected Damage:</span>
                  <span className="font-display text-lg font-bold text-gold-400">
                    {comparisonResult.spell_a.expected_damage.toFixed(2)}
                  </span>
                </div>
                {comparisonResult.spell_a.hit_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-smoke-400">Hit Probability:</span>
                    <span className="text-parchment-200 font-medium">{(comparisonResult.spell_a.hit_probability * 100).toFixed(1)}%</span>
                  </div>
                )}
                {comparisonResult.spell_a.save_failure_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-smoke-400">Save Fail:</span>
                    <span className="text-parchment-200 font-medium">{(comparisonResult.spell_a.save_failure_probability * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Spell B Results */}
            <div className={`dnd-card p-6 border-2 ${
              comparisonResult.winner === 'spell_b' ? 'border-gold-500' :
              comparisonResult.winner === 'tie' ? 'border-arcane-500' : 'border-smoke-600'
            }`}>
              <h3 className="font-display text-xl font-semibold text-parchment-100 mb-4 flex items-center gap-2">
                {comparisonResult.spell_b.spell_name}
                {comparisonResult.winner === 'spell_b' && (
                  <span className="font-display text-xs px-2 py-1 rounded"
                        style={{ background: '#451a03', color: '#fbbf24', border: '1px solid #b45309' }}>
                    👑 Winner
                  </span>
                )}
              </h3>
              <div className="font-body space-y-3">
                {[
                  { label: 'Type', value: comparisonResult.spell_b.spell_type.replace('_', ' ') },
                  { label: 'Average Damage', value: comparisonResult.spell_b.average_damage.toFixed(2) },
                  { label: 'Min – Max', value: `${comparisonResult.spell_b.minimum_damage} – ${comparisonResult.spell_b.maximum_damage}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-smoke-400">{label}:</span>
                    <span className="text-parchment-200 font-medium capitalize">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-smoke-400">Expected Damage:</span>
                  <span className="font-display text-lg font-bold text-gold-400">
                    {comparisonResult.spell_b.expected_damage.toFixed(2)}
                  </span>
                </div>
                {comparisonResult.spell_b.hit_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-smoke-400">Hit Probability:</span>
                    <span className="text-parchment-200 font-medium">{(comparisonResult.spell_b.hit_probability * 100).toFixed(1)}%</span>
                  </div>
                )}
                {comparisonResult.spell_b.save_failure_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-smoke-400">Save Fail:</span>
                    <span className="text-parchment-200 font-medium">{(comparisonResult.spell_b.save_failure_probability * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Winner Summary */}
          <div className="dnd-card p-6 text-center border-t-2 border-gold-800 mb-4">
            {comparisonResult.winner === 'tie' ? (
              <p className="font-display text-xl font-semibold text-arcane-300">
                ⚖️ It's a tie! Both spells have similar expected damage.
              </p>
            ) : (
              <>
                <p className="font-display text-xl font-semibold text-gold-300 mb-2">
                  👑{' '}
                  {comparisonResult.winner === 'spell_a'
                    ? comparisonResult.spell_a.spell_name
                    : comparisonResult.spell_b.spell_name}{' '}
                  is the victor!
                </p>
                <p className="font-body text-parchment-300">
                  Expected damage lead:{' '}
                  <span className="font-display font-bold text-gold-400">{comparisonResult.difference.toFixed(2)}</span>{' '}
                  ({((comparisonResult.difference / Math.min(comparisonResult.spell_a.expected_damage, comparisonResult.spell_b.expected_damage)) * 100).toFixed(1)}% more effective)
                </p>
              </>
            )}
          </div>

          {/* Visual Comparison Chart */}
          <DamageComparisonChart comparisonResult={comparisonResult} />
        </div>
      )}
    </div>
  );
}

export default ComparePage;
