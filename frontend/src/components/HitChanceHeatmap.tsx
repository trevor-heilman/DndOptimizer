/**
 * Hit Chance Heatmap
 *
 * For attack-roll spells: a 2-D colour grid of hit probability across every
 * combination of Spell Attack Bonus (X axis) and Target AC (Y axis).
 *
 * For saving-throw spells: a 2-D colour grid of save-failure probability
 * across Spell Save DC (X axis) × Target Save Bonus (Y axis).
 *
 * The current combat-parameter values are highlighted with a white crosshair
 * marker so the user can instantly see where their setup sits in the space.
 * A short insight line below each map shows the per-point hit-chance delta
 * vs. the reference column/row.
 */
import { Suspense, lazy, useMemo } from 'react';
import type { AnalysisContext, Spell } from '../types/api';

const LazyPlot = lazy(() =>
  import('react-plotly.js').then((mod) => ({ default: mod.default }))
);

// ── Math helpers ─────────────────────────────────────────────────────────────

/** Probability of hitting AC with a given attack bonus (5e d20). */
function hitProb(attackBonus: number, targetAC: number): number {
  return Math.max(0.05, Math.min(0.95, (21 - (targetAC - attackBonus)) / 20));
}

/** Probability of failing a save against a given DC with a given bonus. */
function failProb(saveDC: number, saveBonus: number): number {
  const succProb = Math.max(0.05, Math.min(0.95, (21 - (saveDC - saveBonus)) / 20));
  return 1 - succProb;
}

// ── Axis definitions ──────────────────────────────────────────────────────────

const ATTACK_BONUSES = Array.from({ length: 15 }, (_, i) => i);       // 0 – 14
const TARGET_ACS     = Array.from({ length: 21 }, (_, i) => i + 5);   // 5 – 25

const SAVE_DCS     = Array.from({ length: 15 }, (_, i) => i + 8);     // 8 – 22
const SAVE_BONUSES = Array.from({ length: 15 }, (_, i) => i - 4);     // −4 – +10

// ── Shared Plotly layout defaults ─────────────────────────────────────────────

const PLOT_LAYOUT_BASE: Partial<Plotly.Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: '#0e0b18',
  font: { color: '#c4a882', family: 'Cinzel, serif', size: 12 },
  margin: { t: 36, b: 56, l: 56, r: 20 },
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface AttackHeatmapProps {
  currentAB: number;
  currentAC: number;
}

function AttackHeatmap({ currentAB, currentAC }: AttackHeatmapProps) {
  const z = useMemo(() =>
    TARGET_ACS.map((ac) =>
      ATTACK_BONUSES.map((ab) => parseFloat((hitProb(ab, ac) * 100).toFixed(1)))
    ), []);

  const curHit = hitProb(currentAB, currentAC) * 100;

  const data: Plotly.Data[] = [
    {
      type: 'heatmap',
      x: ATTACK_BONUSES,
      y: TARGET_ACS,
      z,
      colorscale: 'RdYlGn' as unknown as Plotly.ColorScale,
      zmin: 0,
      zmax: 100,
      colorbar: { title: { text: '%' }, tickfont: { color: '#9ca3af', size: 11 } },
      hovertemplate:
        'Attack Bonus: +%{x}<br>Target AC: %{y}<br>Hit Chance: %{z:.1f}%<extra></extra>',
      showscale: true,
    },
    {
      type: 'scatter',
      x: [currentAB],
      y: [currentAC],
      mode: 'markers',
      marker: { symbol: 'cross', size: 14, color: 'white', line: { width: 2.5, color: '#0e0b18' } },
      hovertemplate: `Current: +${currentAB} vs AC ${currentAC} → ${curHit.toFixed(0)}% hit<extra></extra>`,
      showlegend: false,
    } as Plotly.Data,
  ];

  const layout: Partial<Plotly.Layout> = {
    ...PLOT_LAYOUT_BASE,
    title: { text: 'Hit Chance by Attack Bonus & Target AC', font: { color: '#d4af37', size: 13 } },
    xaxis: {
      title: { text: 'Spell Attack Bonus', font: { color: '#c4a882' } },
      tickfont: { color: '#9ca3af', size: 11 },
      gridcolor: '#2a2a40',
    },
    yaxis: {
      title: { text: 'Target AC', font: { color: '#c4a882' } },
      tickfont: { color: '#9ca3af', size: 11 },
      gridcolor: '#2a2a40',
    },
  } as Partial<Plotly.Layout>;

  return (
    <div>
      <Suspense fallback={<div className="h-72 flex items-center justify-center text-smoke-400 font-body text-sm">Loading chart…</div>}>
        <LazyPlot
          data={data}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: 320 }}
          useResizeHandler
        />
      </Suspense>
      <p className="font-body text-xs text-smoke-400 mt-1 pl-1">
        ✦ Crosshair marks your current parameters ({curHit.toFixed(0)}% hit).
        Each step of attack bonus adds ~5 pp; each AC step costs ~5 pp.
      </p>
    </div>
  );
}

interface SaveHeatmapProps {
  currentDC: number;
  currentBonus: number;
  effectiveBonus: number;
  penaltyDie?: string;
}

function SaveHeatmap({ currentDC, currentBonus, effectiveBonus, penaltyDie }: SaveHeatmapProps) {
  const z = useMemo(() =>
    SAVE_BONUSES.map((bonus) =>
      SAVE_DCS.map((dc) => parseFloat((failProb(dc, bonus) * 100).toFixed(1)))
    ), []);

  const curFail = failProb(currentDC, currentBonus) * 100;
  const effFail  = failProb(currentDC, effectiveBonus) * 100;
  const hasPenalty = penaltyDie && penaltyDie !== 'none';

  const data: Plotly.Data[] = [
    {
      type: 'heatmap',
      x: SAVE_DCS,
      y: SAVE_BONUSES,
      z,
      colorscale: 'RdYlGn' as unknown as Plotly.ColorScale,
      zmin: 0,
      zmax: 100,
      colorbar: { title: { text: '%' }, tickfont: { color: '#9ca3af', size: 11 } },
      hovertemplate:
        'Save DC: %{x}<br>Save Bonus: %{y}<br>Fail Chance: %{z:.1f}%<extra></extra>',
      showscale: true,
    },
    // Effective position (after penalty) — gold star marker
    {
      type: 'scatter',
      x: [currentDC],
      y: [effectiveBonus],
      mode: 'markers',
      marker: { symbol: hasPenalty ? 'star' : 'cross', size: 14, color: hasPenalty ? '#d4af37' : 'white', line: { width: 2.5, color: '#0e0b18' } },
      hovertemplate: hasPenalty
        ? `With -${penaltyDie?.toUpperCase()}: DC ${currentDC} vs eff. +${effectiveBonus.toFixed(1)} → ${effFail.toFixed(0)}% fail<extra></extra>`
        : `Current: DC ${currentDC} vs +${currentBonus} → ${curFail.toFixed(0)}% fail<extra></extra>`,
      showlegend: false,
    } as Plotly.Data,
    // Original position (no penalty) — faded white cross shown only when penalty is active
    ...(hasPenalty ? [{
      type: 'scatter',
      x: [currentDC],
      y: [currentBonus],
      mode: 'markers',
      marker: { symbol: 'cross', size: 12, color: 'rgba(255,255,255,0.35)', line: { width: 2, color: '#0e0b18' } },
      hovertemplate: `No penalty: DC ${currentDC} vs +${currentBonus} → ${curFail.toFixed(0)}% fail<extra></extra>`,
      showlegend: false,
    } as Plotly.Data] : []),
  ];

  const layout: Partial<Plotly.Layout> = {
    ...PLOT_LAYOUT_BASE,
    title: { text: 'Save Fail Chance by DC & Target Save Bonus', font: { color: '#d4af37', size: 13 } },
    xaxis: {
      title: { text: 'Spell Save DC', font: { color: '#c4a882' } },
      tickfont: { color: '#9ca3af', size: 11 },
      gridcolor: '#2a2a40',
    },
    yaxis: {
      title: { text: 'Target Save Bonus', font: { color: '#c4a882' } },
      tickfont: { color: '#9ca3af', size: 11 },
      gridcolor: '#2a2a40',
    },
  } as Partial<Plotly.Layout>;

  return (
    <div>
      <Suspense fallback={<div className="h-72 flex items-center justify-center text-smoke-400 font-body text-sm">Loading chart…</div>}>
        <LazyPlot
          data={data}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: 320 }}
          useResizeHandler
        />
      </Suspense>
      <p className="font-body text-xs text-smoke-400 mt-1 pl-1">
        {penaltyDie && penaltyDie !== 'none'
          ? <>&#9733; Gold star = effective position with −{penaltyDie.toUpperCase()} penalty ({effFail.toFixed(0)}% fail). Faded cross = original ({curFail.toFixed(0)}% fail).</>
          : <>✖ Crosshair marks your current parameters ({curFail.toFixed(0)}% save fail).
            Higher DC or lower enemy save bonus pushes the target into the red zone.</>
        }
      </p>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface HitChanceHeatmapProps {
  context: AnalysisContext;
  spell: Spell;
}

/**
 * Renders hit-chance or save-fail probability as a 2-D colour heatmap.
 * Returns null for non-damage / non-roll spells (e.g. purely buff spells).
 */
export function HitChanceHeatmap({ context, spell }: HitChanceHeatmapProps) {
  const showAttack = spell.is_attack_roll;
  const showSave   = spell.is_saving_throw;

  if (!showAttack && !showSave) return null;

  // Compute effective save bonus accounting for save penalty die
  const PENALTY_AVG: Record<string, number> = { none: 0, d4: 2.5, d6: 3.5, d8: 4.5, d10: 5.5, d12: 6.5 };
  const savePenaltyDie = context.save_penalty_die ?? 'none';
  const penaltyAvg = PENALTY_AVG[savePenaltyDie] ?? 0;
  const effectiveSaveBonus = (context.target_save_bonus ?? 0) - penaltyAvg;

  return (
    <div className="mt-6 rounded-xl p-5"
      style={{
        background: 'linear-gradient(155deg, #0a0e1a 0%, #0e1222 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderLeft: '3px solid rgba(99,102,241,0.5)',
      }}>
      <h3 className="dnd-section-title text-base mb-4 flex items-center gap-2">
        <span aria-hidden="true">🎯</span> Hit-Chance Heatmap
      </h3>

      <div className={showAttack && showSave ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>
        {showAttack && (
          <AttackHeatmap
            currentAB={context.caster_attack_bonus ?? 5}
            currentAC={context.target_ac ?? 15}
          />
        )}
        {showSave && (
          <SaveHeatmap
            currentDC={context.spell_save_dc ?? 15}
            currentBonus={context.target_save_bonus ?? 0}
            effectiveBonus={effectiveSaveBonus}
            penaltyDie={savePenaltyDie}
          />
        )}
      </div>
    </div>
  );
}

export default HitChanceHeatmap;
