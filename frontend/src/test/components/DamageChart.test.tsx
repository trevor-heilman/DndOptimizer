/**
 * DamageChart unit tests
 *
 * Three render modes:
 *   1. Empty state       — no damage components → "No damage data available"
 *   2. Leveled spell     — slot-level pills, summary stat pills, per-component chart
 *   3. Cantrip           — character-level tier bars (Lvl 1–4 … Lvl 17+)
 *   4. Fallback          — DamageComponent list but no Spell prop
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DamageComponent, Spell } from '../../types/api';
import { DamageChart } from '../../components/DamageChart';

// ── Recharts mock ─────────────────────────────────────────────────────────────
// ResponsiveContainer requires ResizeObserver which jsdom lacks.
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

function makeComponent(overrides: Partial<DamageComponent> = {}): DamageComponent {
  return {
    id: 'dc-1',
    dice_count: 8,
    die_size: 6,
    damage_type: 'fire',
    flat_modifier: 0,
    timing: 'on_fail',
    on_crit_extra: true,
    scales_with_slot: false,
    upcast_dice_increment: null,
    upcast_scale_step: null,
    uses_spellcasting_modifier: false,
    is_verified: true,
    ...overrides,
  };
}

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: 'spell-1',
    name: 'Fireball',
    level: 3,
    school: 'evocation',
    casting_time: '1 action',
    range: '150 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    is_attack_roll: false,
    is_saving_throw: true,
    is_auto_hit: false,
    save_type: 'DEX',
    half_damage_on_save: true,
    components_v: true,
    components_s: true,
    components_m: true,
    material: 'A tiny ball of bat guano.',
    description: 'A bright streak.',
    higher_level: 'More damage.',
    classes: ['wizard', 'sorcerer'],
    tags: ['damage', 'aoe'],
    source: 'PHB 2014',
    is_custom: false,
    damage_components: [],
    number_of_attacks: 1,
    upcast_dice_increment: null,
    upcast_die_size: null,
    upcast_attacks_increment: null,
    upcast_base_level: null,
    char_level_breakpoints: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Empty state ───────────────────────────────────────────────────────────────

describe('DamageChart — empty state', () => {
  it('shows "No damage data available" when components array is empty', () => {
    render(<DamageChart damageComponents={[]} />);
    expect(screen.getByText(/no damage data available/i)).toBeInTheDocument();
  });
});

// ── Leveled spell mode ────────────────────────────────────────────────────────

describe('DamageChart — leveled spell', () => {
  const components = [makeComponent()];
  const spell = makeSpell();

  it('renders the default title', () => {
    render(<DamageChart damageComponents={components} spell={spell} />);
    expect(screen.getByText(/damage distribution/i)).toBeInTheDocument();
  });

  it('renders a custom title when provided', () => {
    render(<DamageChart damageComponents={components} spell={spell} title="My Chart" />);
    expect(screen.getByText('My Chart')).toBeInTheDocument();
  });

  it('renders slot-level pills starting at the spell base level', () => {
    render(<DamageChart damageComponents={components} spell={spell} />);
    // Fireball is level 3 → first pill is "Slot 3"
    expect(screen.getByRole('button', { name: /slot 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /slot 9/i })).toBeInTheDocument();
  });

  it('does NOT render slot pills below the spell base level', () => {
    render(<DamageChart damageComponents={components} spell={spell} />);
    expect(screen.queryByRole('button', { name: /slot 1/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /slot 2/i })).not.toBeInTheDocument();
  });

  it('highlights the currently selected slot pill', () => {
    render(<DamageChart damageComponents={components} spell={spell} selectedSlot={5} />);
    const pill5 = screen.getByRole('button', { name: /slot 5/i });
    // Active pill has gold background class
    expect(pill5.className).toMatch(/gold/);
  });

  it('calls onSlotChange when a slot pill is clicked', () => {
    const onSlotChange = vi.fn();
    render(
      <DamageChart damageComponents={components} spell={spell} onSlotChange={onSlotChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /slot 5/i }));
    expect(onSlotChange).toHaveBeenCalledWith(5);
  });

  it('renders Min, Avg, Max summary stat pills', () => {
    render(<DamageChart damageComponents={components} spell={spell} />);
    expect(screen.getByText(/^min$/i)).toBeInTheDocument();
    expect(screen.getByText(/^avg$/i)).toBeInTheDocument();
    expect(screen.getByText(/^max$/i)).toBeInTheDocument();
  });

  it('renders Crit Avg and Crit Max pills when showCrit is true (default)', () => {
    render(<DamageChart damageComponents={components} spell={spell} />);
    expect(screen.getByText(/crit avg/i)).toBeInTheDocument();
    expect(screen.getByText(/crit max/i)).toBeInTheDocument();
  });

  it('hides Crit Avg and Crit Max pills when showCrit is false', () => {
    render(<DamageChart damageComponents={components} spell={spell} showCrit={false} />);
    expect(screen.queryByText(/crit avg/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/crit max/i)).not.toBeInTheDocument();
  });

  it('renders the recharts container', () => {
    render(<DamageChart damageComponents={components} spell={spell} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});

// ── Cantrip mode ──────────────────────────────────────────────────────────────

describe('DamageChart — cantrip mode', () => {
  const cantripSpell = makeSpell({
    name: 'Fire Bolt',
    level: 0,
    upcast_dice_increment: 1,
    upcast_die_size: 10,
  });
  const components = [makeComponent({ die_size: 10, timing: 'on_hit' })];

  it('renders a chart container in cantrip mode', () => {
    // Cantrip path uses ScalingBarChart (4 tier bars) rather than per-slot BarChart.
    // Recharts axis labels live in jsdom-opaque SVG nodes, so we verify the
    // rendering path is exercised: chart container + title present, no crash.
    render(<DamageChart damageComponents={components} spell={cantripSpell} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByText(/damage distribution/i)).toBeInTheDocument();
  });

  it('does NOT render slot-level pills for a cantrip', () => {
    render(<DamageChart damageComponents={components} spell={cantripSpell} />);
    expect(screen.queryByRole('button', { name: /slot/i })).not.toBeInTheDocument();
  });
});

// ── Fallback mode (no spell prop) ─────────────────────────────────────────────

describe('DamageChart — fallback (no spell prop)', () => {
  const components = [makeComponent()];

  it('renders without crashing when no spell prop is given', () => {
    render(<DamageChart damageComponents={components} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('does NOT render slot-level pills in fallback mode', () => {
    render(<DamageChart damageComponents={components} />);
    expect(screen.queryByRole('button', { name: /slot/i })).not.toBeInTheDocument();
  });
});
