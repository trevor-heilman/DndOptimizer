/**
 * Damage Comparison Chart Component
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CompareSpellsResponse } from '../types/api';

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
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Damage Comparison Chart</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metric" />
          <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={comparisonResult.spell_a.spell_name} fill="#3b82f6" />
          <Bar dataKey={comparisonResult.spell_b.spell_name} fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DamageComparisonChart;
