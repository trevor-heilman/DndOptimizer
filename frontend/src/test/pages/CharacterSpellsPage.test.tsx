/**
 * Integration tests for CharacterSpellsPage.
 */
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../utils/render';
import { CharacterSpellsPage } from '../../pages/CharacterSpellsPage';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useCharacters', () => ({
  useCharacter: vi.fn(),
  useCharacters: vi.fn(),
  useCharacterSpells: vi.fn(),
  useCreateCharacter: vi.fn(),
  useUpdateCharacter: vi.fn(),
  useDeleteCharacter: vi.fn(),
  useUpdateSpellSlots: vi.fn(),
  useResetSpellSlots: vi.fn(),
}));

import { useCharacter, useCharacterSpells, useUpdateCharacter } from '../../hooks/useCharacters';

const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null, reset: vi.fn() });

const mockCharacter = {
  id: 'char-1', owner: 'user-1', owner_username: 'tester', name: 'Gandalf',
  character_class: 'wizard', character_level: 10, subclass: '',
  portrait_color: 'violet', ruleset: '2014',
  spellcasting_ability_modifier: 5, dc_bonus: 0, attack_bonus_extra: 0,
  spell_slots_used: [0, 0, 0, 0, 0, 0, 0, 0, 0], school_copy_discounts: {},
  spell_save_dc: 17, spell_attack_bonus: 9, proficiency_bonus: 4,
  max_prepared_spells: 15, spellbook_count: 1,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const mockCharacterSpell = {
  id: 'ps-1',
  spell: {
    id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
    casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
    concentration: false, ritual: false, is_attack_roll: false, is_saving_throw: true,
    is_auto_hit: false, save_type: 'DEX', half_damage_on_save: true,
    description: 'A bright streak flashes.', damage_components: [],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  prepared: true,
  added_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  spellbook_name: "Gandalf's Grimoire",
  spellbook_id: 'sb-1',
};

function renderPage(id = 'char-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/characters/:id/spells" element={<CharacterSpellsPage />} />
    </Routes>,
    { initialEntries: [`/characters/${id}/spells`] }
  );
}

beforeEach(() => {
  vi.mocked(useCharacter).mockReturnValue({ data: mockCharacter, isLoading: false, error: null } as any);
  vi.mocked(useCharacterSpells).mockReturnValue({ data: [mockCharacterSpell], isLoading: false, error: null } as any);
  vi.mocked(useUpdateCharacter).mockReturnValue(stubMutation() as any);
});

describe('CharacterSpellsPage', () => {
  it('shows a loading spinner while data is loading', () => {
    vi.mocked(useCharacter).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error when the character is not found', () => {
    vi.mocked(useCharacter).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not found' } } as any);
    renderPage();
    expect(screen.getByText(/could not load/i)).toBeInTheDocument();
  });

  it('renders the character name as a heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /gandalf/i })).toBeInTheDocument();
  });

  it('renders the character class and level', () => {
    renderPage();
    expect(screen.getByText(/wizard/i)).toBeInTheDocument();
  });

  it('renders the Save DC stat', () => {
    renderPage();
    expect(screen.getByText(/save dc/i)).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('renders spell rows for the character spells', () => {
    renderPage();
    expect(screen.getByText('Fireball')).toBeInTheDocument();
  });

  it('renders a back link to the spellbooks page', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /back|library|spellbooks/i });
    expect(link).toHaveAttribute('href', '/spellbooks');
  });

  it('shows the edit character button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  // ── F13: error / empty state ────────────────────────────────────────────

  it('shows a spells error alert when spells fail to load', () => {
    vi.mocked(useCharacterSpells).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Server error' } } as any);
    renderPage();
    expect(screen.getByText(/could not load spells/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch spells/i)).toBeInTheDocument();
  });

  it('shows empty state when the character has no spells', () => {
    vi.mocked(useCharacterSpells).mockReturnValue({ data: [], isLoading: false, error: null } as any);
    renderPage();
    expect(screen.getByText(/no spells found across any tomes/i)).toBeInTheDocument();
  });

  it('shows the total spell count stat', () => {
    renderPage();
    // 1 spell in mock → totalCount = 1 displayed in the header
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
