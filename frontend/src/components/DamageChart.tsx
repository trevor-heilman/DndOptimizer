/**
 * Damage Chart Component
 *
 * When a `spell` is provided:
 *   - Leveled spell  → bars for each slot level (base level → 9), applying upcast scaling.
 *   - Cantrip        → bars for each character-level tier (1-4, 5-10, 11-16, 17+).
 * Fallback (no `spell`): per-component min/avg/max snapshot.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DamageComponent, Spell } from '../types/api';
import { ChartCard } from './ui';

interface DamageChartProps {
  damageComponents: DamageComponent[];
  spell?: Spell;
  title?: string;
}

const CANTRIP_TIERS = [
  { label: 'Lvl 1–4',   tier: 1 },
  { label: 'Lvl 5–10',  tier: 2 },
  { label: 'Lvl 11–16', tier: 3 },
  { label: 'Lvl 17+',   tier: 4 },
];

const TOOLTIP_STYLE = { background: '#1e1e2e', border: '1px solid #7c3aed', borderRadius: 8, padding: '10px 14px' };
const TITLE_STYLE   = { color: '#d4af37', fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: 4 };
const ROW_STYLE     = { color: '#c4a882', fontSize: 13 };

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; min: number; avg: number; max: number } }> }) {
  if (!active || !payload?.length) return null;
  const { label, min, avg, max } = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={TITLE_STYLE}>{label}</p>
      <p style={ROW_STYLE}>Min: <strong>{min}</strong></p>
      <p style={ROW_STYLE}>Avg: <strong>{typeof avg === 'number' ? avg.toFixed(1) : avg}</strong></p>
      <p style={ROW_STYLE}>Max: <strong>{max}</strong></p>
    </div>
  );
}

function ScalingBarChart({ data }: { data: { label: string; avg: number; max: number; min: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
        <XAxis dataKey="label" tick={{ fill: '#c4a882', fontSize: 12 }} />
        <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft', fill: '#c4a882' }} tick={{ fill: '#c4a882', fontSize: 12 }} />
        <Tooltip content={<TooltipContent />} />
        <Legend wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
        <Bar dataKey="avg" name="Average" fill="#b45309" radius={[4, 4, 0, 0]} />
        <Bar dataKey="max" name="Maximum" fill="#d4af37" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DamageChart({ damageComponents, spell, title = 'Damage Distribution' }: DamageChartProps) {

  // ── Leveled spell with upcast: slot-level progression ────────────────────
  if (spell && spell.level > 0 && spell.upcast_dice_increment && spell.upcast_die_size) {
    // Sum base damage across all components
    let baseMin = 0; let baseAvg = 0; let baseMax = 0;
    for (const dc of damageComponents) {
      baseMin += dc.dice_count + (dc.flat_modifier ?? 0);
      baseAvg += dc.dice_count * (dc.die_size + 1) / 2 + (dc.flat_modifier ?? 0);
      baseMax += dc.dice_count * dc.die_size + (dc.flat_modifier ?? 0);
    }

    const upcastBase = spell.upcast_base_level ?? spell.level;
    const upcastDie  = spell.upcast_die_size;
    const upcastInc  = spell.upcast_dice_increment;

    const data = Array.from({ length: 10 - spell.level }, (_, i) => {
      const slot = spell.level + i;
      let extraMin = 0; let extraAvg = 0; let extraMax = 0;
      if (slot > upcastBase) {
        const extraDice = (slot - upcastBase) * upcastInc;
        extraMin = extraDice;
        extraAvg = extraDice * (upcastDie + 1) / 2;
        extraMax = extraDice * upcastDie;
      }
      return {
        label: `Slot ${slot}`,
        min:   Math.round(baseMin + extraMin),
        avg:   parseFloat((baseAvg + extraAvg).toFixed(2)),
        max:   Math.round(baseMax + extraMax),
      };
    });

    return <ChartCard title={title}><ScalingBarChart data={data} /></ChartCard>;
  }

  // ── Cantrip: character-level tier progression ─────────────────────────────
  if (spell && spell.level === 0 && spell.upcast_dice_increment && spell.upcast_die_size) {
    const dieSize = spell.upcast_die_size;
    const inc     = spell.upcast_dice_increment;
    const data = CANTRIP_TIERS.map(({ label, tier }) => {
      const dice = tier * inc;
      return {
        label,
        min: dice,
        avg: parseFloat((dice * (dieSize + 1) / 2).toFixed(2)),
        max: dice * dieSize,
      };
    });
    return <ChartCard title={title}><ScalingBarChart data={data} /></ChartCard>;
  }

  // ── Fallback: per-component snapshot ──────────────────────────────────────
  const data = damageComponents.map((dc) => ({
    label: `${dc.damage_type} (${dc.timing})`,
    min:   dc.dice_count + (dc.flat_modifier ?? 0),
    avg:   parseFloat((dc.dice_count * (dc.die_size + 1) / 2 + (dc.flat_modifier ?? 0)).toFixed(2)),
    max:   dc.dice_count * dc.die_size + (dc.flat_modifier ?? 0),
    roll:  `${dc.dice_count}d${dc.die_size}${dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''}`,
  }));

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
          <XAxis dataKey="label" angle={-15} textAnchor="end" height={80} tick={{ fill: '#c4a882', fontSize: 12 }} />
          <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft', fill: '#c4a882' }} tick={{ fill: '#c4a882', fontSize: 12 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={TOOLTIP_STYLE}>
                  <p style={TITLE_STYLE}>{d.label}</p>
                  <p style={ROW_STYLE}><span style={{ fontWeight: 600 }}>Roll:</span> {d.roll}</p>
                  <p style={ROW_STYLE}><span style={{ fontWeight: 600 }}>Min:</span> {d.min}</p>
                  <p style={ROW_STYLE}><span style={{ fontWeight: 600 }}>Avg:</span> {d.avg.toFixed(1)}</p>
                  <p style={ROW_STYLE}><span style={{ fontWeight: 600 }}>Max:</span> {d.max}</p>
                </div>
              );
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
