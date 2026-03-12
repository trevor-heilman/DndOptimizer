/**
 * Damage Comparison Chart — shows expected damage for both spells at each spell slot level.
 * Includes per-spell level selectors so you can cross-compare (e.g. Spell A at slot 3 vs Spell B at slot 5).
 */
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CompareSpellsResponse, CompareGrowthResponse } from '../types/api';
import { ChartCard } from './ui';

interface DamageComparisonChartProps {
  compareData: CompareSpellsResponse;
  growthData?: CompareGrowthResponse;
}

const COLOR_A = '#818cf8'; // arcane purple
const COLOR_B = '#f87171'; // crimson red

export function DamageComparisonChart({ compareData, growthData }: DamageComparisonChartProps) {
  const nameA = compareData.spell_a.name;
  const nameB = compareData.spell_b.name;

  const slotProfile = growthData?.slot_profile ?? [];
  const charProfile = growthData?.profile ?? [];
  const useSlot = slotProfile.length > 0;
  const useChar = !useSlot && charProfile.length > 0;

  // Default selected levels to each spell's own base level.
  const defaultLevelA = Math.max(compareData.spell_a.level, 1);
  const defaultLevelB = Math.max(compareData.spell_b.level, 1);
  const [selectedLevelA, setSelectedLevelA] = useState(defaultLevelA);
  const [selectedLevelB, setSelectedLevelB] = useState(defaultLevelB);

  // Build chart-renderable data
  const chartData = useSlot
    ? slotProfile.map((p) => ({
        level: p.slot,
        label: p.label,
        [nameA]: parseFloat(p.spell_a_damage.toFixed(2)),
        [nameB]: parseFloat(p.spell_b_damage.toFixed(2)),
      }))
    : useChar
    ? charProfile.map((p) => ({
        level: p.x,
        label: p.label,
        [nameA]: parseFloat(p.spell_a_damage.toFixed(2)),
        [nameB]: parseFloat(p.spell_b_damage.toFixed(2)),
      }))
    : [
        {
          level: compareData.spell_a.level || 1,
          label: `Level ${compareData.spell_a.level || 1}`,
          [nameA]: parseFloat(compareData.spell_a.expected_damage.toFixed(2)),
          [nameB]: parseFloat(compareData.spell_b.expected_damage.toFixed(2)),
        },
      ];

  const xLabel = useSlot ? 'Spell Slot Level' : useChar ? 'Character Level' : 'Spell Level';
  const slotKeys = slotProfile.map((p) => p.slot);

  // Cross-level comparison values
  const pointAtA = slotProfile.find((p) => p.slot === selectedLevelA);
  const pointAtB = slotProfile.find((p) => p.slot === selectedLevelB);
  const dmgAatA = pointAtA?.spell_a_damage ?? compareData.spell_a.expected_damage;
  const dmgBatB = pointAtB?.spell_b_damage ?? compareData.spell_b.expected_damage;
  const crossWinner = dmgAatA >= dmgBatB ? nameA : nameB;
  const crossDiff = Math.abs(dmgAatA - dmgBatB).toFixed(2);

  const levelSelector = useSlot && (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="font-display text-xs" style={{ color: COLOR_A }}>{nameA}</span>
        <span className="font-body text-xs text-smoke-400">at</span>
        <select
          value={selectedLevelA}
          onChange={(e) => setSelectedLevelA(Number(e.target.value))}
          className="dnd-input font-body text-xs py-0.5 px-2 w-auto"
        >
          {slotKeys.map((s) => <option key={s} value={s}>Slot {s}</option>)}
        </select>
      </div>
      <span className="font-body text-xs text-smoke-500">vs</span>
      <div className="flex items-center gap-1.5">
        <span className="font-display text-xs" style={{ color: COLOR_B }}>{nameB}</span>
        <span className="font-body text-xs text-smoke-400">at</span>
        <select
          value={selectedLevelB}
          onChange={(e) => setSelectedLevelB(Number(e.target.value))}
          className="dnd-input font-body text-xs py-0.5 px-2 w-auto"
        >
          {slotKeys.map((s) => <option key={s} value={s}>Slot {s}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <ChartCard title="Damage Comparison Chart by Level" className="mt-6" headerExtra={levelSelector}>
      {/* Cross-level comparison summary */}
      {useSlot && (
        <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-lg bg-smoke-800/50 border border-smoke-700">
          <div>
            <div className="font-display text-xs mb-0.5" style={{ color: COLOR_A }}>{nameA} @ Slot {selectedLevelA}</div>
            <div className="font-display text-2xl font-bold text-parchment-100">{dmgAatA.toFixed(2)}</div>
            <div className="font-body text-xs text-smoke-500">avg damage</div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="font-display text-xs text-smoke-400 mb-1">Winner</div>
            <div className="font-display text-base font-semibold text-gold-300 text-center">{crossWinner}</div>
            <div className="font-body text-xs text-smoke-500 text-center">+{crossDiff} dmg</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xs mb-0.5" style={{ color: COLOR_B }}>{nameB} @ Slot {selectedLevelB}</div>
            <div className="font-display text-2xl font-bold text-parchment-100">{dmgBatB.toFixed(2)}</div>
            <div className="font-body text-xs text-smoke-500">avg damage</div>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3555" />
          <XAxis
            dataKey="level"
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #2d3555', borderRadius: 6 }}
            labelStyle={{ color: '#c4a882' }}
            itemStyle={{ color: '#e2d9c8' }}
            formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : '')}
            labelFormatter={(lvl) => {
              const pt = chartData.find((p) => p.level === lvl);
              return pt?.label ?? `Level ${lvl}`;
            }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey={nameA} fill={COLOR_A} radius={[3, 3, 0, 0]} />
          <Bar dataKey={nameB} fill={COLOR_B} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {useSlot && growthData?.slot_crossover != null && (
        <p className="font-body text-xs text-violet-400 mt-2 text-center">
          Slot crossover at{' '}
          {growthData.slot_profile.find((p) => p.slot === growthData.slot_crossover)?.label ??
            `Slot ${growthData.slot_crossover}`}
          {' '}— {nameA} and {nameB} deal equal damage here
        </p>
      )}
    </ChartCard>
  );
}

export default DamageComparisonChart;
