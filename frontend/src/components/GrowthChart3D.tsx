/**
 * 3D Spell Growth Chart using Plotly.js
 *
 * Renders two scatter3d traces: one per spell.
 * Axes: X = character level, Y = spell slot level (0 = cantrip), Z = expected damage
 */
import { Suspense, lazy } from 'react';
import type { CompareGrowthResponse, GrowthProfilePoint } from '../types/api';

// Lazy-load the heavy Plotly dependency so it stays out of the main bundle.
const LazyPlot = lazy(() =>
  import('react-plotly.js').then((mod) => ({
    default: mod.default,
  }))
);

interface Props {
  result: CompareGrowthResponse;
}

function buildTrace(
  name: string,
  color: string,
  profile: GrowthProfilePoint[],
  damageKey: 'spell_a_damage' | 'spell_b_damage',
  slotKey: 'spell_a_slot' | 'spell_b_slot',
) {
  // Filter out unavailable points (damage === 0 means spell not yet castable)
  const pts = profile.filter((p) => p[damageKey] > 0);

  const x = pts.map((p) => p.x);              // character level
  const y = pts.map((p) => p[slotKey] ?? 0);   // slot level (0 = cantrip) — depth axis
  const z = pts.map((p) => p[damageKey]);       // expected damage — vertical/height axis
  const text = pts.map(
    (p) =>
      `${name}<br>Char Lvl: ${p.x}<br>Slot Lvl: ${
        p[slotKey] == null ? 'Cantrip' : p[slotKey]
      }<br>Damage: ${p[damageKey].toFixed(2)}`,
  );

  return {
    type: 'scatter3d' as const,
    mode: 'lines+markers' as const,
    name,
    x,
    y,
    z,
    text,
    hovertemplate: '%{text}<extra></extra>',
    line: { color, width: 4 },
    marker: { color, size: 5, opacity: 0.9 },
  };
}

export function GrowthChart3D({ result }: Props) {
  const colorA = '#818cf8'; // arcane-400
  const colorB = '#f87171'; // crimson-400

  const traceA = buildTrace(
    result.spell_a.name,
    colorA,
    result.profile,
    'spell_a_damage',
    'spell_a_slot',
  );
  const traceB = buildTrace(
    result.spell_b.name,
    colorB,
    result.profile,
    'spell_b_damage',
    'spell_b_slot',
  );

  const layout = {
    paper_bgcolor: '#0f1117',
    plot_bgcolor: '#0f1117',
    font: { color: '#c4a882', family: 'Georgia, serif' },
    scene: {
      xaxis: {
        title: { text: 'Character Level', font: { color: '#9ca3af', size: 11 } },
        tickfont: { color: '#6b7280', size: 10 },
        gridcolor: '#2d3555',
        backgroundcolor: '#12141c',
        showbackground: true,
        range: [1, 20],
        dtick: 2,
      },
      yaxis: {
        title: { text: 'Spell Slot Level (0 = Cantrip)', font: { color: '#9ca3af', size: 11 } },
        tickfont: { color: '#6b7280', size: 10 },
        gridcolor: '#2d3555',
        backgroundcolor: '#161923',
        showbackground: true,
        range: [0, 9],
        dtick: 1,
        tickvals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        ticktext: ['Cantrip', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      },
      zaxis: {
        title: { text: 'Expected Damage', font: { color: '#9ca3af', size: 11 } },
        tickfont: { color: '#6b7280', size: 10 },
        gridcolor: '#2d3555',
        backgroundcolor: '#12141c',
        showbackground: true,
      },
      camera: {
        eye: { x: 1.6, y: -1.6, z: 0.8 },
      },
      bgcolor: '#0f1117',
    },
    legend: {
      font: { color: '#9ca3af', size: 12 },
      bgcolor: '#1e1e2e',
      bordercolor: '#2d3555',
      borderwidth: 1,
    },
    margin: { l: 0, r: 0, t: 0, b: 0 },
  };

  const config = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['sendDataToCloud', 'toImage'],
    responsive: true,
    displaylogo: false,
  };

  return (
    <div className="w-full rounded-lg overflow-hidden border border-smoke-700">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 text-smoke-400 font-body text-sm">
            Loading 3D chart…
          </div>
        }
      >
        <LazyPlot
          data={[traceA, traceB]}
          layout={layout as any}
          config={config as any}
          style={{ width: '100%', height: '480px' }}
          useResizeHandler
        />
      </Suspense>
    </div>
  );
}
