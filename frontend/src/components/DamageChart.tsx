/**
 * Damage Chart Component
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DamageComponent } from '../types/api';

interface DamageChartProps {
  damageComponents: DamageComponent[];
  title?: string;
}

export function DamageChart({ damageComponents, title = 'Damage Distribution' }: DamageChartProps) {
  // Calculate damage statistics for each component
  const data = damageComponents.map((dc) => {
    const avgRoll = (dc.die_size + 1) / 2;
    const avgDamage = dc.dice_count * avgRoll + (dc.flat_modifier || 0);
    const maxDamage = dc.dice_count * dc.die_size + (dc.flat_modifier || 0);
    const minDamage = dc.dice_count + (dc.flat_modifier || 0);

    return {
      name: `${dc.damage_type} (${dc.timing})`,
      min: minDamage,
      avg: avgDamage,
      max: maxDamage,
      roll: `${dc.dice_count}d${dc.die_size}${dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''}`,
    };
  });

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No damage data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
          <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                    <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Roll:</span> {data.roll}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Min:</span> {data.min}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Avg:</span> {data.avg.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Max:</span> {data.max}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar dataKey="min" fill="#94a3b8" name="Minimum" />
          <Bar dataKey="avg" fill="#3b82f6" name="Average" />
          <Bar dataKey="max" fill="#1e40af" name="Maximum" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DamageChart;
