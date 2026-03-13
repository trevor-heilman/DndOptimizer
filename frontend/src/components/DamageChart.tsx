/**
 * Damage Chart Component
 *
 * For leveled spells: a slot-level selector (base level → 9) with per-component
 * bars at the selected slot. Accounts for number_of_attacks, upcast_dice_increment,
 * and upcast_attacks_increment so multi-attack spells (e.g. Scorching Ray) display
 * correct combined on-hit damage.
 *
 * For cantrips: character-level tier progression bars.
 * Fallback (no `spell`): per-component min/avg/max snapshot.
 */
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DamageComponent, Spell } from '../types/api';
import { ChartCard } from './ui';

interface DamageChartProps {
  damageComponents: DamageComponent[];
  spell?: Spell;
  title?: string;
  /** Controlled slot level — if provided, overrides internal selection. */
  selectedSlot?: number;
  /** Called when the user clicks a slot pill (controlled + uncontrolled). */
  onSlotChange?: (slot: number) => void;
  /** Critical hit rule — synced from Combat Parameters. */
  critType?: 'double_dice' | 'double_damage' | 'max_plus_roll';
  /** Whether the target has resistance to damage (halves all damage). */
  resistance?: boolean;
  /** Elemental Adept damage type — bypasses resistance for matching components. */
  elementalAdeptType?: string | null;
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

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; min: number; avg: number; crit_avg?: number; max: number; crit_max?: number } }> }) {
  if (!active || !payload?.length) return null;
  const { label, min, avg, crit_avg, max, crit_max } = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={TITLE_STYLE}>{label}</p>
      <p style={ROW_STYLE}>Min: <strong>{min}</strong></p>
      <p style={ROW_STYLE}>Avg: <strong>{typeof avg === 'number' ? avg.toFixed(1) : avg}</strong></p>
      {crit_avg !== undefined && (
        <p style={{ ...ROW_STYLE, color: '#f97316' }}>Crit Avg: <strong>{typeof crit_avg === 'number' ? crit_avg.toFixed(1) : crit_avg}</strong></p>
      )}
      <p style={ROW_STYLE}>Max: <strong>{max}</strong></p>
      {crit_max !== undefined && (
        <p style={{ ...ROW_STYLE, color: '#ef4444' }}>Crit Max: <strong>{crit_max}</strong></p>
      )}
    </div>
  );
}

/** Compute on-hit damage at a specific slot level, accounting for both scaling axes. */
function computeAtSlot(
  components: DamageComponent[],
  spell: Spell,
  slotLevel: number,
  critType: 'double_dice' | 'double_damage' | 'max_plus_roll' = 'double_dice',
  resistance = false,
  elementalAdeptType: string | null = null,
) {
  const upcastBase   = spell.upcast_base_level ?? spell.level;
  const levelsAbove  = Math.max(0, slotLevel - upcastBase);
  const extraAttacks = spell.upcast_attacks_increment ? levelsAbove * spell.upcast_attacks_increment : 0;
  const totalAttacks = (spell.number_of_attacks ?? 1) + extraAttacks;
  const upcastDieSize = spell.upcast_die_size ?? 6;

  // Determine whether any component handles its own per-component upcast scaling.
  // If so, skip the spell-level upcast extra-dice row for those components.
  const anyComponentHasOwnUpcast = components.some(dc => dc.upcast_dice_increment != null);

  // On crit, dice are doubled (modifier is NOT doubled per 5e rules).
  // Components with on_crit_extra=false (e.g. Acid Arrow DoT) are not affected by crits.
  const rows = components.map((dc) => {
    const mod = dc.flat_modifier ?? 0;
    // Merge per-component upcast dice directly into this component's dice count.
    const inlineExtra = (dc.upcast_dice_increment ?? 0) * levelsAbove;
    const effectiveDice = dc.dice_count + inlineExtra;
    const canCrit = dc.on_crit_extra !== false;

    const normal_avg = effectiveDice * (dc.die_size + 1) / 2 + mod;
    let crit_avg_per_atk: number;
    if (!canCrit) {
      crit_avg_per_atk = normal_avg;
    } else if (critType === 'double_damage') {
      crit_avg_per_atk = normal_avg * 2;
    } else if (critType === 'max_plus_roll') {
      crit_avg_per_atk = effectiveDice * dc.die_size + effectiveDice * (dc.die_size + 1) / 2 + mod;
    } else {
      crit_avg_per_atk = effectiveDice * 2 * (dc.die_size + 1) / 2 + mod;
    }
    let crit_max_per_atk: number;
    if (!canCrit) {
      crit_max_per_atk = effectiveDice * dc.die_size + mod;
    } else if (critType === 'double_damage') {
      crit_max_per_atk = (effectiveDice * dc.die_size + mod) * 2;
    } else {
      crit_max_per_atk = effectiveDice * 2 * dc.die_size + mod;
    }

    const label = `${effectiveDice}d${dc.die_size} ${dc.damage_type}${dc.timing !== 'on_hit' ? ` (${dc.timing})` : ''}`;
    const bypassRes = elementalAdeptType && elementalAdeptType === dc.damage_type;
    const resMult = (resistance && !bypassRes) ? 0.5 : 1;
    return {
      label,
      min:      parseFloat(((effectiveDice + mod) * totalAttacks * resMult).toFixed(2)),
      avg:      parseFloat((normal_avg * totalAttacks * resMult).toFixed(2)),
      crit_avg: parseFloat((crit_avg_per_atk * totalAttacks * resMult).toFixed(2)),
      max:      parseFloat((effectiveDice * dc.die_size + mod) * totalAttacks * resMult + ''),
      crit_max: parseFloat((crit_max_per_atk * totalAttacks * resMult).toFixed(2)),
    };
  });

  // Only add a separate spell-level upcast row when the spell has spell-level scaling
  // AND no component already consumed those dice via its own upcast_dice_increment.
  const extraDice = (!anyComponentHasOwnUpcast && spell.upcast_dice_increment)
    ? levelsAbove * spell.upcast_dice_increment
    : 0;

  if (extraDice > 0) {
    let crit_avg_upcast: number;
    if (critType === 'double_damage') {
      crit_avg_upcast = extraDice * (upcastDieSize + 1) / 2 * 2;
    } else if (critType === 'max_plus_roll') {
      crit_avg_upcast = extraDice * upcastDieSize + extraDice * (upcastDieSize + 1) / 2;
    } else {
      crit_avg_upcast = extraDice * 2 * (upcastDieSize + 1) / 2;
    }
    // Upcast dice follow the same spell damage type → use spell-level resistance bypass
    const spellBypassRes = elementalAdeptType && components.some(dc => dc.damage_type === elementalAdeptType);
    const upcastResMult = (resistance && !spellBypassRes) ? 0.5 : 1;
    rows.push({
      label: `+${extraDice}d${upcastDieSize} upcast`,
      min:      parseFloat((extraDice * totalAttacks * upcastResMult).toFixed(2)),
      avg:      parseFloat((extraDice * (upcastDieSize + 1) / 2 * totalAttacks * upcastResMult).toFixed(2)),
      crit_avg: parseFloat((crit_avg_upcast * totalAttacks * upcastResMult).toFixed(2)),
      max:      extraDice * upcastDieSize * totalAttacks * upcastResMult,
      crit_max: (critType === 'double_damage' ? extraDice * upcastDieSize * 2 : extraDice * 2 * upcastDieSize) * totalAttacks * upcastResMult,
    });
  }

  const totalMin     = rows.reduce((s, r) => s + r.min, 0);
  const totalAvg     = rows.reduce((s, r) => s + r.avg, 0);
  const totalCritAvg = rows.reduce((s, r) => s + r.crit_avg, 0);
  const totalMax     = rows.reduce((s, r) => s + r.max, 0);
  const totalCritMax = rows.reduce((s, r) => s + r.crit_max, 0);

  return { rows, totalMin, totalAvg, totalCritAvg, totalMax, totalCritMax, totalAttacks };
}

function ScalingBarChart({ data }: { data: { label: string; avg: number; max: number; min: number; crit_avg: number; crit_max: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
        <XAxis dataKey="label" tick={{ fill: '#c4a882', fontSize: 12 }} />
        <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft', fill: '#c4a882' }} tick={{ fill: '#c4a882', fontSize: 12 }} />
        <Tooltip content={<TooltipContent />} />
        <Legend wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
        <Bar dataKey="min"      name="Minimum"  fill="#4c1d95" radius={[4, 4, 0, 0]} />
        <Bar dataKey="avg"      name="Average"  fill="#b45309" radius={[4, 4, 0, 0]} />
        <Bar dataKey="crit_avg" name="Crit Avg" fill="#f97316" radius={[4, 4, 0, 0]} />
        <Bar dataKey="max"      name="Maximum"  fill="#d4af37" radius={[4, 4, 0, 0]} />
        <Bar dataKey="crit_max" name="Crit Max" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DamageChart({ damageComponents, spell, title = 'Damage Distribution', selectedSlot: controlledSlot, onSlotChange, critType = 'double_dice', resistance = false, elementalAdeptType = null }: DamageChartProps) {
  const [internalSlot, setInternalSlot] = useState<number>(() =>
    spell && spell.level > 0 ? spell.level : 1,
  );
  const selectedSlot = controlledSlot ?? internalSlot;
  const handleSlotChange = (slot: number) => {
    setInternalSlot(slot);
    onSlotChange?.(slot);
  };

  if (!damageComponents || damageComponents.length === 0) {
    return (
      <div className="dnd-card p-8 text-center">
        <p className="font-body text-parchment-500">No damage data available</p>
      </div>
    );
  }

  // ── Cantrip: character-level tier progression ─────────────────────────────
  if (spell && spell.level === 0 && spell.upcast_dice_increment && spell.upcast_die_size) {
    const dieSize = spell.upcast_die_size;
    const inc     = spell.upcast_dice_increment;
    // Check if elemental adept bypasses resistance for this cantrip
    const cantripTypes = damageComponents.map(dc => dc.damage_type);
    const bypassRes = elementalAdeptType && cantripTypes.includes(elementalAdeptType);
    const resMult = (resistance && !bypassRes) ? 0.5 : 1;
    const data = CANTRIP_TIERS.map(({ label, tier }) => {
      const dice = tier * inc;
      const avg_base  = dice * (dieSize + 1) / 2;
      const max_base  = dice * dieSize;
      let crit_avg_base: number;
      let crit_max_base: number;
      if (critType === 'double_damage') {
        crit_avg_base = avg_base * 2;
        crit_max_base = max_base * 2;
      } else if (critType === 'max_plus_roll') {
        crit_avg_base = max_base + avg_base;
        crit_max_base = max_base * 2;
      } else {
        // double_dice (standard 5e)
        crit_avg_base = dice * 2 * (dieSize + 1) / 2;
        crit_max_base = dice * 2 * dieSize;
      }
      return {
        label,
        min:      parseFloat((dice * resMult).toFixed(2)),
        avg:      parseFloat((avg_base * resMult).toFixed(2)),
        crit_avg: parseFloat((crit_avg_base * resMult).toFixed(2)),
        max:      parseFloat((max_base * resMult).toFixed(2)),
        crit_max: parseFloat((crit_max_base * resMult).toFixed(2)),
      };
    });
    return <ChartCard title={title}><ScalingBarChart data={data} /></ChartCard>;
  }

  // ── Leveled spell: slot selector + on-hit breakdown ───────────────────────
  if (spell && spell.level > 0) {
    const slots = Array.from({ length: 10 - spell.level }, (_, i) => spell.level + i);
    // Clamp selectedSlot to valid range in case spell changes
    const clampedSlot = Math.max(spell.level, Math.min(9, selectedSlot));
    const { rows, totalMin, totalAvg, totalCritAvg, totalMax, totalCritMax, totalAttacks } = computeAtSlot(damageComponents, spell, clampedSlot, critType, resistance, elementalAdeptType);

    return (
      <ChartCard title={title}>
        {/* Slot level pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => handleSlotChange(slot)}
              className={`font-display text-xs px-2.5 py-1 rounded transition-colors ${
                clampedSlot === slot
                  ? 'bg-gold-600 text-smoke-900 font-bold'
                  : 'bg-smoke-700 text-parchment-400 hover:bg-smoke-600'
              }`}
            >
              Slot {slot}
            </button>
          ))}
        </div>

        {/* Attack count note */}
        {totalAttacks > 1 && (
          <p className="font-body text-xs text-smoke-400 mb-3 italic">
            {totalAttacks} attack{totalAttacks !== 1 ? 's' : ''} at slot {clampedSlot} — combined on-hit damage shown
          </p>
        )}

        {/* Min / Avg / Crit Avg / Max / Crit Max summary pills */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { label: 'Min',      value: totalMin,                 color: '#818cf8' },
            { label: 'Avg',      value: totalAvg.toFixed(1),      color: '#fbbf24' },
            { label: 'Crit Avg', value: totalCritAvg.toFixed(1),  color: '#f97316' },
            { label: 'Max',      value: totalMax,                 color: '#f87171' },
            { label: 'Crit Max', value: totalCritMax,             color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-smoke-800 border border-smoke-700">
              <div className="font-display text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>{label}</div>
              <div className="font-display text-xl font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Per-component bars */}
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 10, right: 30, left: 20, bottom: rows.length > 1 ? 50 : 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#c4a882', fontSize: 11 }}
              angle={rows.length > 1 ? -20 : 0}
              textAnchor={rows.length > 1 ? 'end' : 'middle'}
              height={rows.length > 1 ? 60 : 30}
            />
            <YAxis label={{ value: 'Damage', angle: -90, position: 'insideLeft', fill: '#c4a882' }} tick={{ fill: '#c4a882', fontSize: 12 }} />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ color: '#c4a882', fontFamily: 'Cinzel, serif', fontSize: 13 }} />
            <Bar dataKey="min"      name="Minimum"  fill="#4c1d95" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avg"      name="Average"  fill="#b45309" radius={[4, 4, 0, 0]} />
            <Bar dataKey="crit_avg" name="Crit Avg" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="max"      name="Maximum"  fill="#d4af37" radius={[4, 4, 0, 0]} />
            <Bar dataKey="crit_max" name="Crit Max" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // ── Fallback: per-component snapshot (no spell prop) ──────────────────────
  const data = damageComponents.map((dc) => ({
    label: `${dc.damage_type} (${dc.timing})`,
    min:   dc.dice_count + (dc.flat_modifier ?? 0),
    avg:   parseFloat((dc.dice_count * (dc.die_size + 1) / 2 + (dc.flat_modifier ?? 0)).toFixed(2)),
    max:   dc.dice_count * dc.die_size + (dc.flat_modifier ?? 0),
    roll:  `${dc.dice_count}d${dc.die_size}${dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''}`,
  }));

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
