/**
 * Damage Comparison Chart Component
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CompareSpellsResponse } from '../types/api';
import { ChartCard } from './ui';

interface DamageComparisonChartProps {
  comparisonResult: CompareSpellsResponse;
}

export function DamageComparisonChart({ comparisonResult }: DamageComparisonChartProps) {
  const data = [
    {
      metric: 'Average',
      [comparisonResult.spell_a.spell_name]: comparisonResult.spell_a.average_damage,
      [comparisonResult.spell_b.spell_name]: comparisonResult.spell_b.average_damage,
    },
    {
      metric: 'Expected',
      [comparisonResult.spell_a.spell_name]: comparisonResult.spell_a.expected_damage,
      [comparisonResult.spell_b.spell_name]: comparisonResult.spell_b.expected_damage,
    },
    {
      metric: 'Maximum',
      [comparisonResult.spell_a.spell_name]: comparisonResult.spell_a.maximum_damage,
      [comparisonResult.spell_b.spell_name]: comparisonResult.spell_b.maximum_damage,
    },
  ];

  return (
    <ChartCard title="Damage Comparison Chart" className="mt-6">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
          <XAxis dataKey="metric" tick={{ fill: '#c4a882', fontSize: 13 }} />
          <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft', fill: '#c4a882' }} tick={{ fill: '#c4a882', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, color: '#c4a882', fontFamily: 'Crimson Text, Georgia, serif' }}
            labelStyle={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
          <Bar dataKey={comparisonResult.spell_a.spell_name} fill="#7c3aed" />
          <Bar dataKey={comparisonResult.spell_b.spell_name} fill="#b45309" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default DamageComparisonChart;
