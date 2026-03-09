/**
 * Damage Chart Component
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DamageComponent } from '../types/api';
import { ChartCard } from './ui';

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
      <div className="dnd-card p-8 text-center">
        <p className="font-body text-parchment-500">No damage data available</p>
      </div>
    );
  }

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
          <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} tick={{ fill: '#c4a882', fontSize: 12 }} />
          <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft', fill: '#c4a882' }} tick={{ fill: '#c4a882', fontSize: 12 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div style={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: 4 }}>{data.name}</p>
                    <p style={{ color: '#c4a882', fontSize: 13 }}><span style={{ fontWeight: 600 }}>Roll:</span> {data.roll}</p>
                    <p style={{ color: '#c4a882', fontSize: 13 }}><span style={{ fontWeight: 600 }}>Min:</span> {data.min}</p>
                    <p style={{ color: '#c4a882', fontSize: 13 }}><span style={{ fontWeight: 600 }}>Avg:</span> {data.avg.toFixed(1)}</p>
                    <p style={{ color: '#c4a882', fontSize: 13 }}><span style={{ fontWeight: 600 }}>Max:</span> {data.max}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
          <Bar dataKey="min" fill="#4c1d95" name="Minimum" />
          <Bar dataKey="avg" fill="#b45309" name="Average" />
          <Bar dataKey="max" fill="#d4af37" name="Maximum" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default DamageChart;
