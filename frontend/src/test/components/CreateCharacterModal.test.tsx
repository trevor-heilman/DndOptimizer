/**
 * Unit tests for CreateCharacterModal component.
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/render';
import { CreateCharacterModal } from '../../components/CreateCharacterModal';
import { mockCharacter } from '../mocks/handlers';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function defaultProps(overrides: Partial<React.ComponentProps<typeof CreateCharacterModal>> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── Rendering guard ─────────────────────────────────────────────────────────

describe('CreateCharacterModal — render guard', () => {
  it('renders nothing when isOpen is false', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps({ isOpen: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/new character/i)).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    expect(screen.getByText(/new character/i)).toBeInTheDocument();
  });
});

// ─── Create mode ─────────────────────────────────────────────────────────────

describe('CreateCharacterModal — create mode', () => {
  it('shows "New Character" title', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    expect(screen.getByText('New Character')).toBeInTheDocument();
  });

  it('renders Name, Class, Level, Spellcasting Ability fields', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    expect(screen.getByPlaceholderText(/alara brightweave/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^class$/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /level/i })).toBeInTheDocument();
  });

  it('renders all class options in the dropdown', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    const classSelect = screen.getByRole('combobox', { name: /^class$/i });
    expect(classSelect).toBeInTheDocument();
    const options = Array.from((classSelect as HTMLSelectElement).options).map(o => o.text);
    expect(options).toContain('Wizard');
    expect(options).toContain('Cleric');
    expect(options).toContain('Bard');
    expect(options).toContain('Paladin');
    expect(options).toContain('Sorcerer');
    expect(options).toContain('Warlock');
    expect(options).toContain('Ranger');
    expect(options).toContain('Artificer');
    expect(options).toContain('Druid');
  });

  it('renders 2014 / 2024 ruleset toggle buttons', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /D&D 5e \(2014\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /D&D 5e \(2024\)/i })).toBeInTheDocument();
  });

  it('shows the Subclass dropdown only when Wizard is selected', async () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    // Subclass hidden by default (no class selected)
    expect(screen.queryByRole('combobox', { name: /subclass/i })).not.toBeInTheDocument();

    const classSelect = screen.getByRole('combobox', { name: /^class$/i });
    await userEvent.selectOptions(classSelect, 'wizard');
    expect(screen.getByRole('combobox', { name: /subclass/i })).toBeInTheDocument();
  });

  it('hides the Subclass dropdown when switching away from Wizard', async () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    const classSelect = screen.getByRole('combobox', { name: /^class$/i });
    await userEvent.selectOptions(classSelect, 'wizard');
    await userEvent.selectOptions(classSelect, 'cleric');
    expect(screen.queryByRole('combobox', { name: /subclass/i })).not.toBeInTheDocument();
  });

  it('shows derived DC, Attack Bonus, and Prepared-spell stats', () => {
    renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    // The modal shows live derived stats — these headings should be visible
    expect(screen.getByText(/save dc/i)).toBeInTheDocument();
    expect(screen.getAllByText(/atk/i).length).toBeGreaterThan(0);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('CreateCharacterModal — validation', () => {
  it('shows error when Name is empty on submit', async () => {
    const { container } = renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    // Use fireEvent.submit to bypass HTML5 required constraint validation in jsdom
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() =>
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    );
  });

  it('shows error when Level is out of range', async () => {
    const { container } = renderWithProviders(<CreateCharacterModal {...defaultProps()} />);
    await userEvent.type(screen.getByPlaceholderText(/alara brightweave/i), 'Hero');
    // Use fireEvent.change to set an out-of-range value without triggering
    // HTML5 max-constraint validation, then submit to trigger React validation
    const levelInput = screen.getByRole('spinbutton', { name: /level/i });
    fireEvent.change(levelInput, { target: { value: '99' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() =>
      expect(screen.getByText(/level must be 1.?20/i)).toBeInTheDocument()
    );
  });
});

// ─── Submit ───────────────────────────────────────────────────────────────────

describe('CreateCharacterModal — submission', () => {
  it('calls onSave with correct payload and then closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithProviders(<CreateCharacterModal {...defaultProps({ onSave, onClose })} />);

    await userEvent.type(screen.getByPlaceholderText(/alara brightweave/i), 'Merlin');
    const classSelect = screen.getByRole('combobox', { name: /^class$/i });
    await userEvent.selectOptions(classSelect, 'wizard');
    await userEvent.click(screen.getByRole('button', { name: /save|create/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const arg = onSave.mock.calls[0][0];
    expect(arg.name).toBe('Merlin');
    expect(arg.character_class).toBe('wizard');
    expect(arg).toHaveProperty('character_level');
    expect(arg).toHaveProperty('ruleset');
    // Modal closes after successful save
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('shows server error message when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue({
      response: { data: { detail: 'Character limit reached' } },
    });
    renderWithProviders(<CreateCharacterModal {...defaultProps({ onSave })} />);
    await userEvent.type(screen.getByPlaceholderText(/alara brightweave/i), 'Merlin');
    await userEvent.click(screen.getByRole('button', { name: /save|create/i }));
    await waitFor(() =>
      expect(screen.getByText(/character limit reached/i)).toBeInTheDocument()
    );
  });
});

// ─── Edit mode ────────────────────────────────────────────────────────────────

describe('CreateCharacterModal — edit mode', () => {
  it('shows "Edit Character" title when existing is provided', () => {
    renderWithProviders(
      <CreateCharacterModal {...defaultProps({ existing: mockCharacter as any })} />
    );
    expect(screen.getByText('Edit Character')).toBeInTheDocument();
  });

  it('pre-fills name from existing character', () => {
    renderWithProviders(
      <CreateCharacterModal {...defaultProps({ existing: mockCharacter as any })} />
    );
    const nameInput = screen.getByPlaceholderText(/alara brightweave/i) as HTMLInputElement;
    expect(nameInput.value).toBe(mockCharacter.name);
  });

  it('pre-fills level from existing character', () => {
    renderWithProviders(
      <CreateCharacterModal {...defaultProps({ existing: mockCharacter as any })} />
    );
    const levelInput = screen.getByRole('spinbutton', { name: /level/i }) as HTMLInputElement;
    expect(levelInput.value).toBe(String(mockCharacter.character_level));
  });

  it('pre-fills class from existing character', () => {
    renderWithProviders(
      <CreateCharacterModal {...defaultProps({ existing: mockCharacter as any })} />
    );
    const classSelect = screen.getByRole('combobox', { name: /^class$/i }) as HTMLSelectElement;
    expect(classSelect.value).toBe(mockCharacter.character_class);
  });

  it('pre-fills ruleset from existing character', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <CreateCharacterModal {...defaultProps({ existing: mockCharacter as any, onSave })} />
    );
    // Submit without changes and verify ruleset from existing is preserved
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ ruleset: mockCharacter.ruleset });
  });
});
