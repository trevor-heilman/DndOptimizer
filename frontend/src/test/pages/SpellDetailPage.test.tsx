/**
 * Integration tests for SpellDetailPage.
 */
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../utils/render';
import { SpellDetailPage } from '../../pages/SpellDetailPage';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpells', () => ({
  useSpell: vi.fn(),
  useSpells: vi.fn(),
  useDuplicateSpell: vi.fn(),
  useDeleteSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useCreateSpell: vi.fn(),
  useSpellSources: vi.fn(),
  useImportSpells: vi.fn(),
  useBulkDeleteSpells: vi.fn(),
  useSpellCounts: vi.fn(),
}));

vi.mock('../../hooks/useAnalysis', () => ({
  useAnalyzeSpell: vi.fn(),
  useGetSpellEfficiency: vi.fn(),
  useBatchAnalyzeSpells: vi.fn(),
  useCompareSpells: vi.fn(),
  useBreakevenAnalysis: vi.fn(),
  useCompareGrowth: vi.fn(),
}));

import {
  useSpell,
  useDuplicateSpell,
  useDeleteSpell,
  useUpdateSpell,
  useCreateSpell,
} from '../../hooks/useSpells';
import { useAnalyzeSpell, useGetSpellEfficiency } from '../../hooks/useAnalysis';

const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null, reset: vi.fn() });

const mockSpellFull = {
  id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
  casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
  concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: true,
  is_auto_hit: false, save_type: 'DEX', half_damage_on_save: true,
  components_v: true, components_s: true, components_m: true,
  material: 'A tiny ball of bat guano and sulfur.',
  description: 'A bright streak flashes from your pointing finger to a point you choose.',
  higher_level: 'When you cast this spell using a spell slot of 4th level or higher…',
  upcast_dice_increment: 1, upcast_die_size: 6,
  damage_components: [{ id: 'dc-1', dice_count: 8, die_size: 6, flat_modifier: 0, damage_type: 'fire', timing: 'on_fail', is_verified: true }],
  summon_templates: [],
  source: "Player's Handbook",
  created_by: 'user-1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

function renderDetailPage(id = 'spell-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/spells/:id" element={<SpellDetailPage />} />
    </Routes>,
    { initialEntries: [`/spells/${id}`] }
  );
}

beforeEach(() => {
  vi.mocked(useSpell).mockReturnValue({ data: mockSpellFull, isLoading: false, error: null } as any);
  vi.mocked(useDuplicateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useDeleteSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useCreateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useAnalyzeSpell).mockReturnValue({ ...stubMutation(), data: null } as any);
  vi.mocked(useGetSpellEfficiency).mockReturnValue({ ...stubMutation(), data: null } as any);
});

describe('SpellDetailPage', () => {
  it('shows a loading spinner while data is loading', () => {
    vi.mocked(useSpell).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderDetailPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error message when the spell is not found', () => {
    vi.mocked(useSpell).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not Found' } } as any);
    renderDetailPage();
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('renders the spell name as a heading', () => {
    renderDetailPage();
    expect(screen.getByRole('heading', { name: /fireball/i })).toBeInTheDocument();
  });

  it('renders the school and level', () => {
    renderDetailPage();
    expect(screen.getByText(/evocation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/level 3/i).length).toBeGreaterThan(0);
  });

  it('renders the casting properties', () => {
    renderDetailPage();
    expect(screen.getByText(/1 action/i)).toBeInTheDocument();
    expect(screen.getByText(/150 feet/i)).toBeInTheDocument();
  });

  it('renders the spell description', () => {
    renderDetailPage();
    expect(screen.getByText(/bright streak/i)).toBeInTheDocument();
  });

  it('renders the analysis context form', () => {
    renderDetailPage();
    // mockSpellFull is a saving-throw spell, so the save DC field renders (not Target AC)
    expect(screen.getByLabelText(/spell save dc/i)).toBeInTheDocument();
  });

  it('renders the Analyze DPR button', () => {
    renderDetailPage();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('shows the Summon section for a summon spell', () => {
    vi.mocked(useSpell).mockReturnValue({
      data: {
        ...mockSpellFull,
        id: 'spell-3',
        name: 'Summon Beast',
        tags: ['summoning'],
        summon_templates: [
          {
            id: 'st-1', name: 'Air Body', creature_type: 'Small beast',
            source: 'TCoE', base_hp: 30, hp_per_level: 5, hp_base_level: 2,
            base_ac: 11, ac_per_level: 1, num_attacks_formula: 'floor_half_level',
            attacks: [],
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    renderDetailPage('spell-3');
    expect(screen.getByText(/summoned creature/i)).toBeInTheDocument();
    expect(screen.getByText(/air body/i)).toBeInTheDocument();
  });
});
