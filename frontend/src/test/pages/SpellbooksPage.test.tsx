/**
 * Integration tests for SpellbooksPage.
 */
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { SpellbooksPage } from '../../pages/SpellbooksPage';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpellbooks', () => ({
  useSpellbooks: vi.fn(),
  useCreateSpellbook: vi.fn(),
  useDeleteSpellbook: vi.fn(),
  useDuplicateSpellbook: vi.fn(),
  useReorderSpellbooks: vi.fn(),
  useSpellbook: vi.fn(),
  useUpdateSpellbook: vi.fn(),
  useAddSpellToSpellbook: vi.fn(),
  useRemoveSpellFromSpellbook: vi.fn(),
  useUpdatePreparedSpell: vi.fn(),
  useSpellbookCopyCost: vi.fn(),
}));

vi.mock('../../hooks/useCharacters', () => ({
  useCharacters: vi.fn(),
  useCharacter: vi.fn(),
  useCreateCharacter: vi.fn(),
  useUpdateCharacter: vi.fn(),
  useDeleteCharacter: vi.fn(),
  useUpdateSpellSlots: vi.fn(),
  useResetSpellSlots: vi.fn(),
  useCharacterSpells: vi.fn(),
}));

import {
  useSpellbooks,
  useCreateSpellbook,
  useDeleteSpellbook,
  useDuplicateSpellbook,
  useReorderSpellbooks,
} from '../../hooks/useSpellbooks';
import {
  useCharacters,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
  useUpdateSpellSlots,
  useResetSpellSlots,
} from '../../hooks/useCharacters';

const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null, reset: vi.fn() });

const mockCharacterData = {
  id: 'char-1', owner: 'user-1', owner_username: 'tester', name: 'Gandalf',
  character_class: 'wizard', character_level: 10, subclass: '',
  portrait_color: 'violet', ruleset: '2014',
  spellcasting_ability_modifier: 5, dc_bonus: 0, attack_bonus_extra: 0,
  spell_slots_used: [0, 0, 0, 0, 0, 0, 0, 0, 0], school_copy_discounts: {},
  spell_save_dc: 17, spell_attack_bonus: 9, proficiency_bonus: 4,
  max_prepared_spells: 15, spellbook_count: 1,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const mockSpellbookData = {
  id: 'sb-1', owner: 'user-1', name: "Gandalf's Grimoire",
  character: 'char-1', character_name: 'Gandalf',
  book_color: 'violet', label_color: '', sort_order: 0,
  spell_count: 2, prepared_spell_count: 1,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(useSpellbooks).mockReturnValue({ data: [mockSpellbookData], isLoading: false, error: null } as any);
  vi.mocked(useCharacters).mockReturnValue({ data: [mockCharacterData], isLoading: false, error: null } as any);
  vi.mocked(useCreateSpellbook).mockReturnValue(stubMutation() as any);
  vi.mocked(useDeleteSpellbook).mockReturnValue(stubMutation() as any);
  vi.mocked(useDuplicateSpellbook).mockReturnValue(stubMutation() as any);
  vi.mocked(useReorderSpellbooks).mockReturnValue(stubMutation() as any);
  vi.mocked(useCreateCharacter).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdateCharacter).mockReturnValue(stubMutation() as any);
  vi.mocked(useDeleteCharacter).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdateSpellSlots).mockReturnValue(stubMutation() as any);
  vi.mocked(useResetSpellSlots).mockReturnValue(stubMutation() as any);
});

describe('SpellbooksPage', () => {
  it('renders the My Library heading', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('heading', { name: /my library/i })).toBeInTheDocument();
  });

  it('shows a loading spinner while data is loading', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders character name in the shelf header', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText('Gandalf')).toBeInTheDocument();
  });

  it('renders the spellbook card', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getAllByText("Gandalf's Grimoire")[0]).toBeInTheDocument();
  });

  it('renders the New Character button', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('button', { name: /new character/i })).toBeInTheDocument();
  });

  it('renders the Bind New Tome button', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('button', { name: /bind new tome/i })).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no characters or spellbooks', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText(/your library awaits/i)).toBeInTheDocument();
  });
});
