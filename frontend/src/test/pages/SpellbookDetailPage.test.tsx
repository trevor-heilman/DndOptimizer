/**
 * Integration tests for SpellbookDetailPage.
 */
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../utils/render';
import { SpellbookDetailPage } from '../../pages/SpellbookDetailPage';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpellbooks', () => ({
  useSpellbook: vi.fn(),
  useSpellbooks: vi.fn(),
  useUpdateSpellbook: vi.fn(),
  useRemoveSpellFromSpellbook: vi.fn(),
  useUpdatePreparedSpell: vi.fn(),
  useSpellbookCopyCost: vi.fn(),
  useCreateSpellbook: vi.fn(),
  useDeleteSpellbook: vi.fn(),
  useDuplicateSpellbook: vi.fn(),
  useReorderSpellbooks: vi.fn(),
  useAddSpellToSpellbook: vi.fn(),
}));

vi.mock('../../hooks/useSpells', () => ({
  useSpells: vi.fn(),
  useSpell: vi.fn(),
  useSpellSources: vi.fn(),
  useCreateSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useDeleteSpell: vi.fn(),
  useDuplicateSpell: vi.fn(),
  useImportSpells: vi.fn(),
  useBulkDeleteSpells: vi.fn(),
  useSpellCounts: vi.fn(),
}));

vi.mock('../../hooks/useAnalysis', () => ({
  useBatchAnalyzeSpells: vi.fn(),
  useGetSpellEfficiency: vi.fn(),
  useAnalyzeSpell: vi.fn(),
  useCompareSpells: vi.fn(),
  useBreakevenAnalysis: vi.fn(),
  useCompareGrowth: vi.fn(),
}));

vi.mock('../../hooks/useCharacters', () => ({
  useCharacter: vi.fn(),
  useCharacters: vi.fn(),
  useCreateCharacter: vi.fn(),
  useUpdateCharacter: vi.fn(),
  useDeleteCharacter: vi.fn(),
  useUpdateSpellSlots: vi.fn(),
  useResetSpellSlots: vi.fn(),
  useCharacterSpells: vi.fn(),
}));

import { useSpellbook, useUpdateSpellbook, useRemoveSpellFromSpellbook, useUpdatePreparedSpell, useSpellbookCopyCost } from '../../hooks/useSpellbooks';
import { useSpellSources } from '../../hooks/useSpells';
import { useBatchAnalyzeSpells, useGetSpellEfficiency } from '../../hooks/useAnalysis';
import { useCharacter } from '../../hooks/useCharacters';

const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, data: null, error: null, reset: vi.fn() });

const mockSpell = {
  id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
  casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
  concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: true,
  is_auto_hit: false, save_type: 'DEX', half_damage_on_save: true,
  description: 'A bright streak flashes.', damage_components: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const mockSpellbook = {
  id: 'sb-1', owner: 'user-1', name: "Gandalf's Grimoire",
  description: 'My test spellbook', character: null, character_name: null,
  book_color: 'violet', label_color: '', sort_order: 0,
  spell_count: 1, prepared_spell_count: 1,
  prepared_spells: [
    { id: 'ps-1', spell: mockSpell, prepared: true, added_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

function renderDetailPage(id = 'sb-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/spellbooks/:id" element={<SpellbookDetailPage />} />
    </Routes>,
    { initialEntries: [`/spellbooks/${id}`] }
  );
}

beforeEach(() => {
  vi.mocked(useSpellbook).mockReturnValue({ data: mockSpellbook, isLoading: false, error: null } as any);
  vi.mocked(useUpdateSpellbook).mockReturnValue(stubMutation() as any);
  vi.mocked(useRemoveSpellFromSpellbook).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdatePreparedSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useSpellbookCopyCost).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
  vi.mocked(useSpellSources).mockReturnValue({ data: [], isLoading: false } as any);
  vi.mocked(useBatchAnalyzeSpells).mockReturnValue(stubMutation() as any);
  vi.mocked(useGetSpellEfficiency).mockReturnValue(stubMutation() as any);
  vi.mocked(useCharacter).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
});

describe('SpellbookDetailPage', () => {
  it('shows a loading spinner while the spellbook is loading', () => {
    vi.mocked(useSpellbook).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderDetailPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error when the spellbook is not found', () => {
    vi.mocked(useSpellbook).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not found' } } as any);
    renderDetailPage();
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('renders the spellbook name as a heading', () => {
    renderDetailPage();
    expect(screen.getByRole('heading', { name: /gandalf/i })).toBeInTheDocument();
  });

  it('renders a spell row for each prepared spell', () => {
    renderDetailPage();
    expect(screen.getByText('Fireball')).toBeInTheDocument();
  });

  it('renders the Edit toggle button', () => {
    renderDetailPage();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('renders a back link to the spellbooks list', () => {
    renderDetailPage();
    const link = screen.getByRole('link', { name: /back|library|spellbooks/i });
    expect(link).toHaveAttribute('href', '/spellbooks');
  });

  it('renders the search filter input', () => {
    renderDetailPage();
    expect(screen.getByPlaceholderText(/spell name/i)).toBeInTheDocument();
  });

  it('shows a character-linked spellbook with the character name', () => {
    vi.mocked(useSpellbook).mockReturnValue({
      data: { ...mockSpellbook, character: 'char-1', character_name: 'Gandalf' },
      isLoading: false, error: null,
    } as any);
    vi.mocked(useCharacter).mockReturnValue({
      data: {
        id: 'char-1', name: 'Gandalf', character_class: 'wizard', character_level: 10,
        spell_save_dc: 17, spell_attack_bonus: 9,
      },
      isLoading: false, error: null,
    } as any);
    renderDetailPage();
    expect(screen.getByText(/gandalf/i)).toBeInTheDocument();
  });

  // ── F13: error / empty state ────────────────────────────────────────────

  it('shows "Spellbook Not Found" title in error state', () => {
    vi.mocked(useSpellbook).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not found' } } as any);
    renderDetailPage();
    expect(screen.getByText('Spellbook Not Found')).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument();
  });

  it('shows a "Back to Spellbooks" button in error state', () => {
    vi.mocked(useSpellbook).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not found' } } as any);
    renderDetailPage();
    expect(screen.getByRole('button', { name: /back to spellbooks/i })).toBeInTheDocument();
  });

  it('shows the "No Spells Yet" empty state when the spellbook has no spells', () => {
    vi.mocked(useSpellbook).mockReturnValue({
      data: { ...mockSpellbook, prepared_spells: [], spell_count: 0, prepared_spell_count: 0 },
      isLoading: false, error: null,
    } as any);
    renderDetailPage();
    expect(screen.getByRole('heading', { name: 'No Spells Yet' })).toBeInTheDocument();
  });

  it('shows an "Add Your First Spell" action in the empty spellbook state', () => {
    vi.mocked(useSpellbook).mockReturnValue({
      data: { ...mockSpellbook, prepared_spells: [], spell_count: 0, prepared_spell_count: 0 },
      isLoading: false, error: null,
    } as any);
    renderDetailPage();
    expect(screen.getByRole('button', { name: /add your first spell/i })).toBeInTheDocument();
  });
});
