/**
 * Cantrip Scaling Chart
 * Shows average and max damage for the 4 cantrip tier breakpoints.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard } from './ui';

interface CantripScalingChartProps {
  upcastDiceIncrement: number;
  upcastDieSize: number;
}

const TIERS = [
  { label: 'Lvl 1–4',  tier: 1 },
  { label: 'Lvl 5–10', tier: 2 },
  { label: 'Lvl 11–16', tier: 3 },
  { label: 'Lvl 17+',   tier: 4 },
];

const TIER_COLORS = ['#7c3aed', '#9333ea', '#a855f7', '#d4af37'];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { label: string; dice: number; avg: number; max: number } }>;
  upcastDieSize: number;
}

function CustomTooltip({ active, payload, upcastDieSize }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { label, dice, avg, max } = payload[0].payload;
  return (
    <div style={{ background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, padding: '8px 14px' }}>
      <p style={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#c4b5fd', marginBottom: 2 }}>
        <strong>{dice}d{upcastDieSize}</strong>
      </p>
      <p style={{ color: '#fbbf24' }}>Average: <strong>{avg.toFixed(1)}</strong></p>
      <p style={{ color: '#94a3b8' }}>Max: <strong>{max}</strong></p>
    </div>
  );
}

export function CantripScalingChart({ upcastDiceIncrement, upcastDieSize }: CantripScalingChartProps) {
  const data = TIERS.map(({ label, tier }) => {
    const dice = tier * upcastDiceIncrement;
    const avg  = dice * (upcastDieSize + 1) / 2;
    const max  = dice * upcastDieSize;
    return { label, dice, avg, max };
  });

  return (
    <ChartCard title={`Cantrip Scaling — d${upcastDieSize} per tier`} className="mt-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
          <XAxis dataKey="label" tick={{ fill: '#c4a882', fontSize: 12 }} />
          <YAxis tick={{ fill: '#c4a882', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip upcastDieSize={upcastDieSize} />} />
          <Bar dataKey="avg" name="Avg Damage" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={TIER_COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default CantripScalingChart;
