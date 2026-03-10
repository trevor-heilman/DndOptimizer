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
  const nameA = comparisonResult.spell_a.name;
  const nameB = comparisonResult.spell_b.name;

  const data = [
    {
      metric: 'Expected Damage',
      [nameA]: comparisonResult.spell_a.expected_damage,
      [nameB]: comparisonResult.spell_b.expected_damage,
    },
    {
      metric: 'Efficiency',
      [nameA]: comparisonResult.spell_a.efficiency,
      [nameB]: comparisonResult.spell_b.efficiency,
    },
  ];

  return (
    <ChartCard title="Damage Comparison Chart" className="mt-6">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
          <XAxis dataKey="metric" tick={{ fill: '#c4a882', fontSize: 13 }} />
          <YAxis tick={{ fill: '#c4a882', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, color: '#c4a882', fontFamily: 'Crimson Text, Georgia, serif' }}
            labelStyle={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
          <Bar dataKey={nameA} fill="#7c3aed" />
          <Bar dataKey={nameB} fill="#b45309" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default DamageComparisonChart;
