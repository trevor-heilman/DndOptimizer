/**
 * Efficiency Chart Component
 *
 * Shows expected damage (bar) and efficiency = expected_damage / slot_level (line)
 * per spell slot level, using a dual-Y-axis ComposedChart.
 */
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { EfficiencyDataPoint } from '../types/api';
import { ChartCard } from './ui';

interface EfficiencyChartProps {
  data: EfficiencyDataPoint[];
  spellName: string;
}

function formatSlotLabel(level: number) {
  return `L${level}`;
}

export function EfficiencyChart({ data, spellName }: EfficiencyChartProps) {
  if (data.length === 0) {
    return (
      <div className="dnd-card p-8 text-center">
        <p className="font-body text-parchment-500">No efficiency data available.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    slot: formatSlotLabel(d.slot_level),
    slot_level: d.slot_level,
    expected_damage: parseFloat(d.expected_damage.toFixed(2)),
    efficiency: parseFloat(d.efficiency.toFixed(2)),
  }));

  return (
    <ChartCard
      title={`Upcast Efficiency — ${spellName}`}
      subtitle="Bars = expected damage at each slot level · Line = expected damage ÷ slot level (efficiency score)"
      footer={
        data.length > 0 ? (() => {
          const best = data.reduce((prev, cur) => cur.efficiency > prev.efficiency ? cur : prev);
          return (
            <p className="font-body text-sm text-parchment-400 text-center">
              Best efficiency at{' '}
              <span className="font-display font-semibold text-gold-400">
                Level {best.slot_level}
              </span>{' '}
              — {best.efficiency.toFixed(2)} damage per slot level
            </p>
          );
        })() : undefined
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
          <XAxis
            dataKey="slot"
            label={{ value: 'Slot Level', position: 'insideBottom', offset: -2, fill: '#c4a882' }}
            height={40}
            tick={{ fill: '#c4a882', fontSize: 12 }}
          />
          {/* Left Y-axis: expected damage */}
          <YAxis
            yAxisId="damage"
            orientation="left"
            label={{ value: 'Expected Damage', angle: -90, position: 'insideLeft', offset: -5, fill: '#c4a882' }}
            tick={{ fill: '#c4a882', fontSize: 12 }}
          />
          {/* Right Y-axis: efficiency */}
          <YAxis
            yAxisId="efficiency"
            orientation="right"
            label={{ value: 'Efficiency', angle: 90, position: 'insideRight', offset: 10, fill: '#c4a882' }}
            tick={{ fill: '#c4a882', fontSize: 12 }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = chartData.find((d) => d.slot === label);
              return (
                <div style={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  <p style={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: 4 }}>Slot Level {row?.slot_level}</p>
                  {payload.map((p) => (
                    <p key={p.name} style={{ color: p.color as string }}>
                      {p.name}: <span style={{ fontWeight: 600 }}>{Number(p.value).toFixed(2)}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend verticalAlign="top" wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
          <Bar
            yAxisId="damage"
            dataKey="expected_damage"
            name="Expected Damage"
            fill="#7c3aed"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="efficiency"
            type="monotone"
            dataKey="efficiency"
            name="Efficiency Score"
            stroke="#d4af37"
            strokeWidth={2}
            dot={{ fill: '#d4af37', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default EfficiencyChart;
