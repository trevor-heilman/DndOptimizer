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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Compare Spells</h1>

      {/* Spell Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Spell 1 Selection */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Spell 1</h2>
          <div className="mb-3">
            <input
              type="text"
              value={spell1Search}
              onChange={(e) => setSpell1Search(e.target.value)}
              placeholder="Search spells..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
            />
            <select
              value={spell1Id}
              onChange={(e) => setSpell1Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a spell...</option>
              {filteredSpells1.slice(0, 50).map((spell) => (
                <option key={spell.id} value={spell.id}>
                  {spell.name} (Level {spell.level})
                </option>
              ))}
            </select>
          </div>

          {spell1 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{spell1.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Level:</span>{' '}
                  {spell1.level === 0 ? 'Cantrip' : spell1.level}
                </p>
                <p>
                  <span className="font-medium">School:</span>{' '}
                  {spell1.school.charAt(0).toUpperCase() + spell1.school.slice(1)}
                </p>
                <p>
                  <span className="font-medium">Type:</span>{' '}
                  {spell1.is_attack_roll ? 'Attack Roll' : spell1.is_saving_throw ? 'Saving Throw' : 'Other'}
                </p>
                {spell1.damage_components && spell1.damage_components.length > 0 && (
                  <p>
                    <span className="font-medium">Damage:</span>{' '}
                    {spell1.damage_components
                      .map((dc) => `${dc.dice_count}d${dc.die_size} ${dc.damage_type}`)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spell 2 Selection */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Spell 2</h2>
          <div className="mb-3">
            <input
              type="text"
              value={spell2Search}
              onChange={(e) => setSpell2Search(e.target.value)}
              placeholder="Search spells..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
            />
            <select
              value={spell2Id}
              onChange={(e) => setSpell2Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a spell...</option>
              {filteredSpells2.slice(0, 50).map((spell) => (
                <option key={spell.id} value={spell.id}>
                  {spell.name} (Level {spell.level})
                </option>
              ))}
            </select>
          </div>

          {spell2 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{spell2.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Level:</span>{' '}
                  {spell2.level === 0 ? 'Cantrip' : spell2.level}
                </p>
                <p>
                  <span className="font-medium">School:</span>{' '}
                  {spell2.school.charAt(0).toUpperCase() + spell2.school.slice(1)}
                </p>
                <p>
                  <span className="font-medium">Type:</span>{' '}
                  {spell2.is_attack_roll ? 'Attack Roll' : spell2.is_saving_throw ? 'Saving Throw' : 'Other'}
                </p>
                {spell2.damage_components && spell2.damage_components.length > 0 && (
                  <p>
                    <span className="font-medium">Damage:</span>{' '}
                    {spell2.damage_components
                      .map((dc) => `${dc.dice_count}d${dc.die_size} ${dc.damage_type}`)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Context */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <AnalysisContextForm context={context} onChange={setContext} />
      </div>

      {/* Compare Button */}
      <div className="mb-6">
        <button
          onClick={handleCompare}
          disabled={!spell1Id || !spell2Id || compareSpells.isPending}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
        >
          {compareSpells.isPending ? 'Analyzing...' : 'Compare Spells'}
        </button>
      </div>

      {/* Error Display */}
      {compareSpells.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">Failed to compare spells. Please try again.</p>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Comparison Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Spell A Results */}
            <div
              className={`p-6 rounded-lg border-2 ${
                comparisonResult.winner === 'spell_a'
                  ? 'border-green-500 bg-green-50'
                  : comparisonResult.winner === 'tie'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {comparisonResult.spell_a.spell_name}
                {comparisonResult.winner === 'spell_a' && (
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">Winner</span>
                )}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-semibold capitalize">
                    {comparisonResult.spell_a.spell_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Damage:</span>
                  <span className="font-semibold">{comparisonResult.spell_a.average_damage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Damage:</span>
                  <span className="font-semibold text-lg text-primary-600">
                    {comparisonResult.spell_a.expected_damage.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min - Max:</span>
                  <span className="font-semibold">
                    {comparisonResult.spell_a.minimum_damage} - {comparisonResult.spell_a.maximum_damage}
                  </span>
                </div>
                {comparisonResult.spell_a.hit_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hit Probability:</span>
                    <span className="font-semibold">
                      {(comparisonResult.spell_a.hit_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {comparisonResult.spell_a.save_failure_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Save Fail Probability:</span>
                    <span className="font-semibold">
                      {(comparisonResult.spell_a.save_failure_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Spell B Results */}
            <div
              className={`p-6 rounded-lg border-2 ${
                comparisonResult.winner === 'spell_b'
                  ? 'border-green-500 bg-green-50'
                  : comparisonResult.winner === 'tie'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {comparisonResult.spell_b.spell_name}
                {comparisonResult.winner === 'spell_b' && (
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">Winner</span>
                )}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-semibold capitalize">
                    {comparisonResult.spell_b.spell_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Damage:</span>
                  <span className="font-semibold">{comparisonResult.spell_b.average_damage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Damage:</span>
                  <span className="font-semibold text-lg text-primary-600">
                    {comparisonResult.spell_b.expected_damage.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min - Max:</span>
                  <span className="font-semibold">
                    {comparisonResult.spell_b.minimum_damage} - {comparisonResult.spell_b.maximum_damage}
                  </span>
                </div>
                {comparisonResult.spell_b.hit_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hit Probability:</span>
                    <span className="font-semibold">
                      {(comparisonResult.spell_b.hit_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {comparisonResult.spell_b.save_failure_probability !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Save Fail Probability:</span>
                    <span className="font-semibold">
                      {(comparisonResult.spell_b.save_failure_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Winner Summary */}
          <div className="p-6 bg-gray-100 rounded-lg text-center">
            {comparisonResult.winner === 'tie' ? (
              <p className="text-xl font-semibold text-gray-900">
                It's a tie! Both spells have similar expected damage.
              </p>
            ) : (
              <>
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  {comparisonResult.winner === 'spell_a'
                    ? comparisonResult.spell_a.spell_name
                    : comparisonResult.spell_b.spell_name}{' '}
                  is the winner!
                </p>
                <p className="text-gray-700">
                  Expected damage difference: <span className="font-bold">{comparisonResult.difference.toFixed(2)}</span>{' '}
                  (
                  {(
                    (comparisonResult.difference /
                      Math.min(comparisonResult.spell_a.expected_damage, comparisonResult.spell_b.expected_damage)) *
                    100
                  ).toFixed(1)}
                  % more effective)
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
