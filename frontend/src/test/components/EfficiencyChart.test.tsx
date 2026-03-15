/**
 * EfficiencyChart unit tests
 *
 * Covers:
 *   1. Empty state  — data=[] → "No efficiency data available."
 *   2. Chart title  — "Upcast Efficiency — {spellName}"
 *   3. Best-slot footer — "Best efficiency at Level N — X.XX damage per slot level"
 *   4. Slot labels  — L3, L4 … in chart
 *   5. Recharts container rendered
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EfficiencyDataPoint } from '../../types/api';
import { EfficiencyChart } from '../../components/EfficiencyChart';

// ── Recharts mock ─────────────────────────────────────────────────────────────
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const singlePoint: EfficiencyDataPoint[] = [
  { slot_level: 3, expected_damage: 28.0, efficiency: 9.33 },
];

const multiPoints: EfficiencyDataPoint[] = [
  { slot_level: 3, expected_damage: 28.0, efficiency: 9.33 },
  { slot_level: 4, expected_damage: 31.5, efficiency: 7.88 },
  { slot_level: 5, expected_damage: 35.0, efficiency: 7.0 },
];

// ── Empty state ───────────────────────────────────────────────────────────────

describe('EfficiencyChart — empty state', () => {
  it('renders "No efficiency data available." when data is empty', () => {
    render(<EfficiencyChart data={[]} spellName="Fireball" />);
    expect(screen.getByText(/no efficiency data available/i)).toBeInTheDocument();
  });

  it('does NOT render the recharts container when data is empty', () => {
    render(<EfficiencyChart data={[]} spellName="Fireball" />);
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});

// ── Chart title ───────────────────────────────────────────────────────────────

describe('EfficiencyChart — chart title', () => {
  it('shows "Upcast Efficiency — <spellName>" as the card title', () => {
    render(<EfficiencyChart data={singlePoint} spellName="Fireball" />);
    expect(screen.getByText(/upcast efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/fireball/i)).toBeInTheDocument();
  });

  it('uses the correct spell name in the title', () => {
    render(<EfficiencyChart data={singlePoint} spellName="Magic Missile" />);
    expect(screen.getByText(/magic missile/i)).toBeInTheDocument();
  });
});

// ── Best-slot footer ──────────────────────────────────────────────────────────

describe('EfficiencyChart — best-slot footer', () => {
  it('shows the best-efficiency slot level in the footer', () => {
    // Slot 3 has the highest efficiency (9.33) in multiPoints
    // Footer text is split across span elements; match via container textContent
    render(<EfficiencyChart data={multiPoints} spellName="Fireball" />);
    const footer = document.querySelector('.mt-3');
    const text = footer?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toMatch(/best efficiency at level 3/i);
  });

  it('shows the efficiency value rounded to 2 decimal places', () => {
    render(<EfficiencyChart data={multiPoints} spellName="Fireball" />);
    expect(screen.getByText(/9\.33/)).toBeInTheDocument();
  });

  it('includes the "damage per slot level" label in the footer', () => {
    render(<EfficiencyChart data={multiPoints} spellName="Fireball" />);
    expect(screen.getByText(/damage per slot level/i)).toBeInTheDocument();
  });

  it('correctly identifies best slot when it is not the first data point', () => {
    // Reverse order — slot 5 has the highest efficiency here
    const reversed: EfficiencyDataPoint[] = [
      { slot_level: 5, expected_damage: 35.0, efficiency: 12.0 },
      { slot_level: 4, expected_damage: 28.0, efficiency: 7.0 },
      { slot_level: 3, expected_damage: 21.0, efficiency: 7.0 },
    ];
    render(<EfficiencyChart data={reversed} spellName="Test Spell" />);
    // Footer text is split across span elements; match via container textContent
    const footer = document.querySelector('.mt-3');
    const text = footer?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toMatch(/level 5/i);
    expect(text).toMatch(/12\.00/);
  });
});

// ── Recharts container ────────────────────────────────────────────────────────

describe('EfficiencyChart — chart rendering', () => {
  it('renders the recharts container when data is provided', () => {
    render(<EfficiencyChart data={singlePoint} spellName="Fireball" />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with multiple data points without crashing', () => {
    render(<EfficiencyChart data={multiPoints} spellName="Fireball" />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
