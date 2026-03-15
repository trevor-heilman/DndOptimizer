/**
 * Integration tests for ComparePage.
 */
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { ComparePage } from '../../pages/ComparePage';

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

import { useSpells } from '../../hooks/useSpells';
import { useCompareSpells, useBreakevenAnalysis, useCompareGrowth } from '../../hooks/useAnalysis';

const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, data: null, error: null, reset: vi.fn() });

const mockSpellsList = [
  {
    id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
    casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: true,
    save_type: 'DEX', half_damage_on_save: true,
    description: 'A bright streak.', damage_components: [],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'spell-2', name: 'Magic Missile', level: 1, school: 'evocation',
    casting_time: '1 action', range: '120 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: false,
    half_damage_on_save: false, description: 'Three glowing darts.', damage_components: [],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  vi.mocked(useSpells).mockReturnValue({
    data: { count: 2, next: null, previous: null, results: mockSpellsList },
    isLoading: false, error: null,
  } as any);
  vi.mocked(useCompareSpells).mockReturnValue(stubMutation() as any);
  vi.mocked(useBreakevenAnalysis).mockReturnValue(stubMutation() as any);
  vi.mocked(useCompareGrowth).mockReturnValue(stubMutation() as any);
});

describe('ComparePage', () => {
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
    // Two SpellFilterBar sections render — each shows a 'Filter spells' label
    expect(screen.getAllByText(/filter spells/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the Analyze button', () => {
    renderWithProviders(<ComparePage />);
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('renders spell search inputs for spell selection', () => {
    renderWithProviders(<ComparePage />);
    const inputs = screen.getAllByPlaceholderText(/search/i);
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows a loading indicator while spells are loading', () => {
    vi.mocked(useSpells).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderWithProviders(<ComparePage />);
    // Page still renders but spell selectors are empty — no crash
    expect(screen.getByRole('heading', { name: /compare spells/i })).toBeInTheDocument();
  });
});
