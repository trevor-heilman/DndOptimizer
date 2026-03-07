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
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No efficiency data available.</p>
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
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Upcast Efficiency — {spellName}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Bars = expected damage at each slot level · Line = expected damage ÷ slot level (efficiency score)
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="slot"
            label={{ value: 'Slot Level', position: 'insideBottom', offset: -2 }}
            height={40}
          />
          {/* Left Y-axis: expected damage */}
          <YAxis
            yAxisId="damage"
            orientation="left"
            label={{ value: 'Expected Damage', angle: -90, position: 'insideLeft', offset: -5 }}
          />
          {/* Right Y-axis: efficiency */}
          <YAxis
            yAxisId="efficiency"
            orientation="right"
            label={{ value: 'Efficiency', angle: 90, position: 'insideRight', offset: 10 }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = chartData.find((d) => d.slot === label);
              return (
                <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg text-sm">
                  <p className="font-semibold text-gray-900 mb-1">Slot Level {row?.slot_level}</p>
                  {payload.map((p) => (
                    <p key={p.name} style={{ color: p.color }}>
                      {p.name}: <span className="font-medium">{Number(p.value).toFixed(2)}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend verticalAlign="top" />
          <Bar
            yAxisId="damage"
            dataKey="expected_damage"
            name="Expected Damage"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="efficiency"
            type="monotone"
            dataKey="efficiency"
            name="Efficiency Score"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Best efficiency call-out */}
      {data.length > 0 && (() => {
        const best = data.reduce((prev, cur) => cur.efficiency > prev.efficiency ? cur : prev);
        return (
          <p className="text-sm text-gray-600 mt-3 text-center">
            Best efficiency at{' '}
            <span className="font-semibold text-primary-700">
              Level {best.slot_level}
            </span>{' '}
            — {best.efficiency.toFixed(2)} damage per slot level
          </p>
        );
      })()}
    </div>
  );
}

export default EfficiencyChart;
