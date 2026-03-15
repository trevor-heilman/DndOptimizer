/**
 * Integration tests for SpellbooksPage.
 */
import { screen, fireEvent } from '@testing-library/react';
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

// ── Shared fixtures ─────────────────────────────────────────────────────────

const stubMutation = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isError: false,
  data: undefined,
  error: null,
  reset: vi.fn(),
});

const mockCharacter = {
  id: 'char-1', owner: 'user-1', owner_username: 'tester', name: 'Gandalf',
  character_class: 'wizard', character_level: 10, subclass: '',
  portrait_color: 'violet', ruleset: '2014',
  spellcasting_ability_modifier: 5, dc_bonus: 0, attack_bonus_extra: 0,
  spell_slots_used: [0, 0, 0, 0, 0, 0, 0, 0, 0], school_copy_discounts: {},
  spell_save_dc: 17, spell_attack_bonus: 9, proficiency_bonus: 4,
  max_prepared_spells: 15, spellbook_count: 1, prepared_spells_bonus: 0,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const mockCharacter2 = {
  ...mockCharacter,
  id: 'char-2', name: 'Elminster',
  character_class: 'sorcerer', character_level: 5,
  spellbook_count: 0,
};

const mockSpellbook = {
  id: 'sb-1', owner: 'user-1', name: "Gandalf's Grimoire",
  character: 'char-1', character_name: 'Gandalf',
  book_color: 'violet', label_color: '', sort_order: 0,
  spell_count: 2, prepared_spell_count: 1,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const mockUnassignedBook = {
  ...mockSpellbook,
  id: 'sb-2', name: 'Loose Scrolls',
  character: null, character_name: null,
};

// ── Default beforeEach ──────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useSpellbooks).mockReturnValue({ data: [mockSpellbook], isLoading: false, error: null } as any);
  vi.mocked(useCharacters).mockReturnValue({ data: [mockCharacter], isLoading: false, error: null } as any);
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

// ═══════════════════════════════════════════════════════════════════════════
// Describe groups
// ═══════════════════════════════════════════════════════════════════════════

describe('SpellbooksPage — page structure', () => {
  it('renders the My Library heading', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('heading', { name: /my library/i })).toBeInTheDocument();
  });

  it('renders the "Arcane Repository" subtitle', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText(/arcane repository/i)).toBeInTheDocument();
  });

  it('renders the New Character button', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('button', { name: /new character/i })).toBeInTheDocument();
  });

  it('renders the Bind New Tome button', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('button', { name: /bind new tome/i })).toBeInTheDocument();
  });

  it('shows the character + tome count summary', () => {
    renderWithProviders(<SpellbooksPage />);
    // The action-bar paragraph reads "1 character · 1 tome"
    expect(screen.getByText(/1 character/i)).toBeInTheDocument();
    // "1 tome" also appears on spellbook cards, so use getAllByText
    expect(screen.getAllByText(/1 tome/i).length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — loading state', () => {
  it('shows a loading spinner while data is loading', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not show shelves while loading', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.queryByText('Gandalf')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — error state', () => {
  it('shows an error alert when loading fails', () => {
    vi.mocked(useSpellbooks).mockReturnValue({
      data: undefined, isLoading: false,
      error: new Error('Network error'),
    } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText(/error loading library/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — empty state', () => {
  it('shows the "Your library awaits" message with no data', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText(/your library awaits/i)).toBeInTheDocument();
  });

  it('shows a "Create Your First Character" call-to-action in the empty state', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('button', { name: /create your first character/i })).toBeInTheDocument();
  });

  it('does not show the empty state when a character exists', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.queryByText(/your library awaits/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — character shelf', () => {
  it('renders the character name in the shelf header', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText('Gandalf')).toBeInTheDocument();
  });

  it('renders the class badge with level', () => {
    renderWithProviders(<SpellbooksPage />);
    // CharacterShelf renders "Wizard 10" as the classBadge
    expect(screen.getByText(/wizard 10/i)).toBeInTheDocument();
  });

  it('renders computed stat chips: Save DC, Atk Bonus, Prof', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText('Save DC')).toBeInTheDocument();
    expect(screen.getByText('Atk Bonus')).toBeInTheDocument();
    expect(screen.getByText('Prof')).toBeInTheDocument();
  });

  it('renders the Save DC value for the character', () => {
    renderWithProviders(<SpellbooksPage />);
    // spell_save_dc: 17
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('renders the spellbook card with the book name', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getAllByText("Gandalf's Grimoire")[0]).toBeInTheDocument();
  });

  it('renders multiple character shelves when multiple characters exist', () => {
    vi.mocked(useCharacters).mockReturnValue({ data: [mockCharacter, mockCharacter2], isLoading: false, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText('Gandalf')).toBeInTheDocument();
    expect(screen.getByText('Elminster')).toBeInTheDocument();
  });

  it('renders the All Spells → link for the character', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('link', { name: /all spells/i })).toBeInTheDocument();
  });

  it('renders the + Tome quick-add button inside the shelf header', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByRole('button', { name: /\+ tome/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — unassigned shelf', () => {
  it('renders the Unassigned Tomes shelf when an unassigned book exists', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: [mockSpellbook, mockUnassignedBook], isLoading: false, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    expect(screen.getByText(/unassigned tomes/i)).toBeInTheDocument();
  });

  it('does not render the Unassigned shelf when all books are assigned', () => {
    renderWithProviders(<SpellbooksPage />);
    expect(screen.queryByText(/unassigned tomes/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — New Character modal', () => {
  it('opens the New Character modal when the button is clicked', () => {
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /new character/i }));
    expect(screen.getByRole('heading', { name: /new character/i })).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', () => {
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /new character/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('heading', { name: /new character/i })).not.toBeInTheDocument();
  });

  it('opens the New Character modal from the empty-state CTA', () => {
    vi.mocked(useSpellbooks).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    vi.mocked(useCharacters).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /create your first character/i }));
    expect(screen.getByRole('heading', { name: /new character/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellbooksPage — Bind New Tome modal', () => {
  it('opens the New Spellbook modal when the Bind New Tome button is clicked', () => {
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /bind new tome/i }));
    expect(screen.getByRole('heading', { name: /new spellbook/i })).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', () => {
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /bind new tome/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('heading', { name: /new spellbook/i })).not.toBeInTheDocument();
  });

  it('opens the spellbook modal from the + Tome button in the shelf header', () => {
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /\+ tome/i }));
    expect(screen.getByRole('heading', { name: /new spellbook/i })).toBeInTheDocument();
  });

  it('lists available characters in the modal character selector', () => {
    renderWithProviders(<SpellbooksPage />);
    fireEvent.click(screen.getByRole('button', { name: /bind new tome/i }));
    // CreateSpellbookModal renders a character <select> with the character name as option
    expect(screen.getByRole('option', { name: /gandalf/i })).toBeInTheDocument();
  });
});
