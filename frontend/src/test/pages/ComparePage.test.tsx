/**
 * Integration tests for ComparePage.
 */
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { ComparePage } from '../../pages/ComparePage';
import type { CompareSpellsResponse, BreakevenResponse, CompareGrowthResponse } from '../../types/api';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpells', () => ({
  useSpells: vi.fn(),
  useSpellSources: vi.fn(),
  useSpell: vi.fn(),
  useCreateSpell: vi.fn(),
  useDeleteSpell: vi.fn(),
  useDuplicateSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useImportSpells: vi.fn(),
  useBulkDeleteSpells: vi.fn(),
  useSpellCounts: vi.fn(),
}));

vi.mock('../../hooks/useAnalysis', () => ({
  useCompareSpells: vi.fn(),
  useBreakevenAnalysis: vi.fn(),
  useCompareGrowth: vi.fn(),
  useAnalyzeSpell: vi.fn(),
  useGetSpellEfficiency: vi.fn(),
  useBatchAnalyzeSpells: vi.fn(),
}));

vi.mock('../../components/GrowthChart3D', () => ({
  GrowthChart3D: () => <div data-testid="growth-chart-3d" />,
}));

vi.mock('../../components/DamageComparisonChart', () => ({
  DamageComparisonChart: () => <div data-testid="damage-comparison-chart" />,
}));

// Recharts ResponsiveContainer requires ResizeObserver which jsdom lacks
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

import React from 'react';
import { useSpells } from '../../hooks/useSpells';
import { useCompareSpells, useBreakevenAnalysis, useCompareGrowth } from '../../hooks/useAnalysis';

const stubMutation = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isError: false,
  data: undefined,
  error: null,
  reset: vi.fn(),
});

// ── Shared fixture data ─────────────────────────────────────────────────────

const mockSpellsList = [
  {
    id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
    casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: true,
    save_type: 'DEX', half_damage_on_save: true, description: 'A bright streak.',
    damage_components: [], classes: ['wizard', 'sorcerer'],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'spell-2', name: 'Magic Missile', level: 1, school: 'evocation',
    casting_time: '1 action', range: '120 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: false,
    half_damage_on_save: false, description: 'Three glowing darts.',
    damage_components: [], classes: ['wizard'],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockCompareResult: CompareSpellsResponse = {
  spell_a: { name: 'Fireball',       level: 3, expected_damage: 28.5, efficiency: 9.5 },
  spell_b: { name: 'Magic Missile',  level: 1, expected_damage: 10.5, efficiency: 7.3 },
  winner: 'spell_a',
  damage_difference: 18.0,
};

const mockBreakevenResult: BreakevenResponse = {
  spell_a: { id: 'spell-1', name: 'Fireball',      level: 3 },
  spell_b: { id: 'spell-2', name: 'Magic Missile', level: 1 },
  breakeven_ac: 14,
  breakeven_save_bonus: null,
  ac_profile: [
    { value: 10, spell_a_damage: 30, spell_b_damage: 10 },
    { value: 15, spell_a_damage: 25, spell_b_damage: 10 },
    { value: 20, spell_a_damage: 18, spell_b_damage: 10 },
  ],
  save_profile: [
    { value: 0, spell_a_damage: 28, spell_b_damage: 10 },
    { value: 5, spell_a_damage: 20, spell_b_damage: 10 },
  ],
};

const mockGrowthResult: CompareGrowthResponse = {
  spell_a: { id: 'spell-1', name: 'Fireball',      level: 3 },
  spell_b: { id: 'spell-2', name: 'Magic Missile', level: 1 },
  crossover_x: 7,
  slot_crossover: null,
  profile: [
    { x: 1, label: 'Level 1 (Slot 1)', spell_a_damage: 0,    spell_b_damage: 3.5, spell_a_slot: null, spell_b_slot: 1 },
    { x: 5, label: 'Level 5 (Slot 3)', spell_a_damage: 28.5, spell_b_damage: 5.0, spell_a_slot: 3,    spell_b_slot: 3 },
  ],
  slot_profile: [
    { slot: 3, label: 'Level 3', spell_a_damage: 28.5, spell_b_damage: 5.0 },
  ],
};

// ── Default beforeEach ──────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useSpells).mockReturnValue({
    data: { count: 2, next: null, previous: null, results: mockSpellsList },
    isLoading: false, error: null,
  } as any);
  vi.mocked(useCompareSpells).mockReturnValue(stubMutation() as any);
  vi.mocked(useBreakevenAnalysis).mockReturnValue(stubMutation() as any);
  vi.mocked(useCompareGrowth).mockReturnValue(stubMutation() as any);
});

// ── Helper: select a spell via the combobox ──────────────────────────────────

function selectSpell(searchInputIndex: number, spellName: string) {
  const inputs = screen.getAllByPlaceholderText(/search spells/i);
  const input = inputs[searchInputIndex];
  fireEvent.change(input, { target: { value: spellName } });
  const option = screen.getAllByText(spellName)[0].closest('button');
  if (option) fireEvent.pointerDown(option, { bubbles: true, cancelable: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Describe groups
// ═══════════════════════════════════════════════════════════════════════════

describe('ComparePage — page structure', () => {
  it('renders the Compare Spells heading', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /compare spells/i })).toBeInTheDocument();
  });

  it('renders two spell selector labels', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByText(/spell 1/i)).toBeInTheDocument();
    expect(screen.getByText(/spell 2/i)).toBeInTheDocument();
  });

  it('renders spell filter controls for each spell', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getAllByText(/filter spells/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the Analyze button', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('renders two search inputs for spell selection', () => {
    renderWithProviders(<ComparePage />);
    const inputs = screen.getAllByPlaceholderText(/search spells/i);
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders without crashing while spells are loading', () => {
    vi.mocked(useSpells).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /compare spells/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ComparePage — Analyze button state', () => {
  it('is disabled when no spells are selected', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
  });

  it('shows loading text while analysis is pending', () => {
    vi.mocked(useCompareSpells).mockReturnValue({ ...stubMutation(), isPending: true } as any);
    // Still need both spells selected for the page to start analyzing — the button
    // label change is what we verify (the button is also disabled while pending)
    renderWithProviders(<ComparePage />);
    // The loading label key phrase
    expect(screen.getByRole('button', { name: /invoking/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ComparePage — spell combobox', () => {
  it('shows a filtered dropdown when typing in the search input', () => {
    renderWithProviders(<ComparePage />);
    const [firstInput] = screen.getAllByPlaceholderText(/search spells/i);
    fireEvent.change(firstInput, { target: { value: 'Fire' } });
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    // Magic Missile should not be in the dropdown
    expect(screen.queryByText('Magic Missile')).not.toBeInTheDocument();
  });

  it('shows "No spells found" for a search with no matches', () => {
    renderWithProviders(<ComparePage />);
    const [firstInput] = screen.getAllByPlaceholderText(/search spells/i);
    fireEvent.change(firstInput, { target: { value: 'ZZZNoMatch' } });
    expect(screen.getByText(/no spells found/i)).toBeInTheDocument();
  });

  it('shows the spell detail card after a spell is selected', () => {
    renderWithProviders(<ComparePage />);
    selectSpell(0, 'Fireball');
    // The spell card renders the spell name as a heading inside the card
    expect(screen.getByRole('heading', { name: 'Fireball' })).toBeInTheDocument();
  });

  it('shows level and school labels in the spell detail card', () => {
    renderWithProviders(<ComparePage />);
    selectSpell(0, 'Fireball');
    // Detail card renders labelled rows: "Level:" and "School:"
    expect(screen.getByText('Level:')).toBeInTheDocument();
    expect(screen.getByText('School:')).toBeInTheDocument();
    // School value appears at least once (also in combobox pill, filter bar, etc.)
    expect(screen.getAllByText(/evocation/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Saving Throw" type for a saving throw spell', () => {
    renderWithProviders(<ComparePage />);
    selectSpell(0, 'Fireball');
    expect(screen.getByText(/saving throw/i)).toBeInTheDocument();
  });

  it('shows the Enemies and Has Resistance controls once a spell is selected', () => {
    renderWithProviders(<ComparePage />);
    selectSpell(0, 'Fireball');
    expect(screen.getByText(/enemies/i)).toBeInTheDocument();
    expect(screen.getByText(/has resistance/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ComparePage — Comparison Results section', () => {
  beforeEach(() => {
    vi.mocked(useCompareSpells).mockReturnValue({ ...stubMutation(), data: mockCompareResult } as any);
  });

  it('shows the Comparison Results heading when data is available', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /comparison results/i })).toBeInTheDocument();
  });

  it('shows both spell names in the results cards', () => {
    renderWithProviders(<ComparePage />);
    // Both spell names appear in the results section (as h3 headings)
    expect(screen.getByRole('heading', { name: /fireball/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /magic missile/i })).toBeInTheDocument();
  });

  it('shows expected damage values for each spell', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByText('28.50')).toBeInTheDocument();
    expect(screen.getByText('10.50')).toBeInTheDocument();
  });

  it('shows the winner badge on the winning spell', () => {
    renderWithProviders(<ComparePage />);
    // winner is 'spell_a' (Fireball) — crown emoji badge appears
    expect(screen.getByText(/winner/i)).toBeInTheDocument();
  });

  it('shows the damage difference', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByText('18.00')).toBeInTheDocument();
    expect(screen.getByText(/damage difference/i)).toBeInTheDocument();
  });

  it('renders the DamageComparisonChart stub', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByTestId('damage-comparison-chart')).toBeInTheDocument();
  });

  it('is hidden before analysis has run', () => {
    // Reset to no-data state (this describe's beforeEach already set data)
    vi.mocked(useCompareSpells).mockReturnValue(stubMutation() as any);
    renderWithProviders(<ComparePage />);
    expect(screen.queryByRole('heading', { name: /comparison results/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ComparePage — Spell Growth Analysis section', () => {
  beforeEach(() => {
    vi.mocked(useCompareGrowth).mockReturnValue({ ...stubMutation(), data: mockGrowthResult } as any);
  });

  it('shows the Spell Growth Analysis heading', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /spell growth analysis/i })).toBeInTheDocument();
  });

  it('shows the crossover level', () => {
    renderWithProviders(<ComparePage />);
    // crossover_x = 7 → rendered as "Level 7" or "Crossover: L7"
    expect(screen.getByText(/level 7/i)).toBeInTheDocument();
  });

  it('shows the 3D View toggle button', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('button', { name: /3d view/i })).toBeInTheDocument();
  });

  it('is hidden before growth analysis has run', () => {
    vi.mocked(useCompareGrowth).mockReturnValue(stubMutation() as any);
    renderWithProviders(<ComparePage />);
    expect(screen.queryByRole('heading', { name: /spell growth analysis/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ComparePage — Breakeven Analysis section', () => {
  beforeEach(() => {
    vi.mocked(useBreakevenAnalysis).mockReturnValue({ ...stubMutation(), data: mockBreakevenResult } as any);
  });

  it('shows the Breakeven Analysis heading', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /breakeven analysis/i })).toBeInTheDocument();
  });

  it('shows the breakeven AC value', () => {
    renderWithProviders(<ComparePage />);
    // breakeven_ac = 14
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('shows a dash for null breakeven save bonus', () => {
    renderWithProviders(<ComparePage />);
    // breakeven_save_bonus = null → renders '—'
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the Re-analyze button', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('button', { name: /re-analyze/i })).toBeInTheDocument();
  });

  it('is hidden before breakeven analysis has run', () => {
    vi.mocked(useBreakevenAnalysis).mockReturnValue(stubMutation() as any);
    renderWithProviders(<ComparePage />);
    expect(screen.queryByRole('heading', { name: /breakeven analysis/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ComparePage — error state', () => {
  it('shows an error card when compareSpells fails', () => {
    vi.mocked(useCompareSpells).mockReturnValue({ ...stubMutation(), isError: true } as any);
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /error/i })).toBeInTheDocument();
    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
  });

  it('shows an error card when breakeven fails', () => {
    vi.mocked(useBreakevenAnalysis).mockReturnValue({ ...stubMutation(), isError: true } as any);
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('heading', { name: /error/i })).toBeInTheDocument();
  });
});
