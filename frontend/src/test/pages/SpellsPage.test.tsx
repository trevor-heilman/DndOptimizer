/**
 * Integration tests for SpellsPage.
 */
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { SpellsPage } from '../../pages/SpellsPage';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpells', () => ({
  useSpells: vi.fn(),
  useSpellSources: vi.fn(),
  useImportSpells: vi.fn(),
  useCreateSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useDeleteSpell: vi.fn(),
  useDuplicateSpell: vi.fn(),
  useBulkDeleteSpells: vi.fn(),
  useSpellCounts: vi.fn(),
}));

import {
  useSpells,
  useSpellSources,
  useImportSpells,
  useCreateSpell,
  useUpdateSpell,
  useDeleteSpell,
  useDuplicateSpell,
  useBulkDeleteSpells,
  useSpellCounts,
} from '../../hooks/useSpells';

const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null, reset: vi.fn() });

const mockSpellsList = [
  {
    id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
    casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: true,
    save_type: 'DEX', half_damage_on_save: true,
    description: 'A bright streak flashes from your pointing finger.',
    damage_components: [{ id: 'dc-1', dice_count: 8, die_size: 6, flat_modifier: 0, damage_type: 'fire', timing: 'on_fail', is_verified: true }],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'spell-2', name: 'Magic Missile', level: 1, school: 'evocation',
    casting_time: '1 action', range: '120 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: false,
    half_damage_on_save: false, description: 'Three glowing darts of magical force.',
    damage_components: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  vi.mocked(useSpells).mockReturnValue({
    data: { count: 2, next: null, previous: null, results: mockSpellsList },
    isLoading: false,
    error: null,
  } as any);
  vi.mocked(useSpellSources).mockReturnValue({ data: ["Player's Handbook", "Xanathar's Guide"], isLoading: false } as any);
  vi.mocked(useImportSpells).mockReturnValue(stubMutation() as any);
  vi.mocked(useCreateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useDeleteSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useDuplicateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useBulkDeleteSpells).mockReturnValue(stubMutation() as any);
  vi.mocked(useSpellCounts).mockReturnValue({ data: { system: 417, imported: 0, custom: 0 }, isLoading: false } as any);
});

describe('SpellsPage', () => {
  it('renders the Spell Library heading', () => {
    renderWithProviders(<SpellsPage />);
    expect(screen.getByRole('heading', { name: /spell library/i })).toBeInTheDocument();
  });

  it('renders a spell card for each result', () => {
    renderWithProviders(<SpellsPage />);
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    expect(screen.getByText('Magic Missile')).toBeInTheDocument();
  });

  it('shows a loading spinner while data is loading', () => {
    vi.mocked(useSpells).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderWithProviders(<SpellsPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no spells are returned', () => {
    vi.mocked(useSpells).mockReturnValue({
      data: { count: 0, next: null, previous: null, results: [] },
      isLoading: false, error: null,
    } as any);
    renderWithProviders(<SpellsPage />);
    expect(screen.getByText(/no spells found/i)).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderWithProviders(<SpellsPage />);
    expect(screen.getByPlaceholderText(/spell name/i)).toBeInTheDocument();
  });

  it('renders pagination controls when there are multiple pages', () => {
    vi.mocked(useSpells).mockReturnValue({
      data: { count: 120, next: 'http://api/spells/?page=2', previous: null, results: mockSpellsList },
      isLoading: false, error: null,
    } as any);
    renderWithProviders(<SpellsPage />);
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('shows Import and Create Spell buttons', () => {
    renderWithProviders(<SpellsPage />);
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create spell/i })).toBeInTheDocument();
  });

  it('shows the result count', () => {
    renderWithProviders(<SpellsPage />);
    expect(screen.getByText(/2 spells/i)).toBeInTheDocument();
  });
});
