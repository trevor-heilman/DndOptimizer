/**
 * Tests for the CreateSpellModal component.
 * Covers: render guards, validation, field interactions,
 * edit-mode pre-population, and mutation invocation.
 */
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { CreateSpellModal } from '../../components/CreateSpellModal';
import type { Spell } from '../../types/api';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpells', () => ({
  useCreateSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useSpellSources: vi.fn(),
}));

import { useCreateSpell, useUpdateSpell, useSpellSources } from '../../hooks/useSpells';

// ── Shared utilities ─────────────────────────────────────────────────────────

const noop = () => {};

function stubMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  };
}

/** A minimal leveled spell record for edit-mode tests. */
const spellToEdit: Spell = {
  id: 'spell-edit-1',
  name: 'Green-Flame Blade',
  level: 1,
  school: 'evocation',
  casting_time: '1 action',
  range: '5 feet',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  is_attack_roll: true,
  is_saving_throw: false,
  is_auto_hit: false,
  half_damage_on_save: false,
  description: 'You brandish the weapon used in the spell.',
  higher_level: '',
  classes: ['wizard', 'sorcerer'],
  tags: [],
  char_level_breakpoints: { '5': { die_count: 1, die_size: 8, flat: 0 } },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── Global setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useCreateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useSpellSources).mockReturnValue({ data: ["Player's Handbook"], isLoading: false } as any);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CreateSpellModal', () => {
  // ── Render guard ─────────────────────────────────────────────────────────

  describe('when isOpen is false', () => {
    it('renders nothing', () => {
      const { container } = renderWithProviders(
        <CreateSpellModal isOpen={false} onClose={noop} />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ── Create mode rendering ─────────────────────────────────────────────────

  describe('create mode', () => {
    function renderOpen(onClose = vi.fn()) {
      return renderWithProviders(<CreateSpellModal isOpen={true} onClose={onClose} />);
    }

    it('shows the "Create Custom Spell" title', () => {
      renderOpen();
      expect(screen.getByText(/create custom spell/i)).toBeInTheDocument();
    });

    it('renders Name, Level, School and Description fields', () => {
      renderOpen();
      expect(screen.getByPlaceholderText(/e\.g\. Thunderwave/i)).toBeInTheDocument();
      // Level select — default value "Level 1"
      expect(screen.getByDisplayValue('Level 1')).toBeInTheDocument();
      // School select — default value capitalised "Abjuration"
      expect(screen.getByDisplayValue('Abjuration')).toBeInTheDocument();
      // Description textarea
      expect(screen.getByPlaceholderText(/enter the spell description/i)).toBeInTheDocument();
    });

    it('renders Cancel and Create Spell buttons', () => {
      renderOpen();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create spell/i })).toBeInTheDocument();
    });

    it('calls onClose when the Cancel button is clicked', () => {
      const onClose = vi.fn();
      renderOpen(onClose);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when the × header button is clicked', () => {
      const onClose = vi.fn();
      renderOpen(onClose);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── Validation ────────────────────────────────────────────────────────────

  describe('validation', () => {
    function renderOpen() {
      renderWithProviders(<CreateSpellModal isOpen={true} onClose={noop} />);
    }

    function clickSubmit() {
      fireEvent.click(screen.getByRole('button', { name: /create spell/i }));
    }

    it('shows "Name is required" when the name field is blank on submit', () => {
      renderOpen();
      clickSubmit();
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('shows "Description is required" when description is blank on submit', () => {
      renderOpen();
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Thunderwave/i), {
        target: { value: 'My Spell' },
      });
      clickSubmit();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    it('shows save type error when Saving Throw is enabled but no save type chosen', () => {
      renderOpen();
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Thunderwave/i), {
        target: { value: 'My Spell' },
      });
      fireEvent.change(screen.getByPlaceholderText(/enter the spell description/i), {
        target: { value: 'A description.' },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: /saving throw/i }));
      clickSubmit();
      expect(screen.getByText(/save type is required/i)).toBeInTheDocument();
    });

    it('shows a material error when M component is checked but material is empty', () => {
      renderOpen();
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Thunderwave/i), {
        target: { value: 'My Spell' },
      });
      fireEvent.change(screen.getByPlaceholderText(/enter the spell description/i), {
        target: { value: 'A description.' },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: /M \(Material\)/i }));
      clickSubmit();
      expect(screen.getByText(/material component description is required/i)).toBeInTheDocument();
    });

    it('shows a casting time error when "Other" is selected but the value is empty', () => {
      renderOpen();
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Thunderwave/i), {
        target: { value: 'My Spell' },
      });
      fireEvent.change(screen.getByPlaceholderText(/enter the spell description/i), {
        target: { value: 'A description.' },
      });
      // Switch casting time to "Other"
      fireEvent.change(screen.getByDisplayValue('1 action'), { target: { value: 'Other' } });
      // Do NOT fill in the custom casting time input
      clickSubmit();
      expect(screen.getByText(/casting time is required/i)).toBeInTheDocument();
    });

    it('does not call mutateAsync when validation fails', () => {
      renderOpen();
      clickSubmit();
      const createMutation = vi.mocked(useCreateSpell).mock.results[0].value;
      expect(createMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  // ── Conditional sections ──────────────────────────────────────────────────

  describe('conditional sections', () => {
    function renderOpen() {
      renderWithProviders(<CreateSpellModal isOpen={true} onClose={noop} />);
    }

    it('shows the Save Ability section when Saving Throw is toggled on', () => {
      renderOpen();
      expect(screen.queryByText(/save ability/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox', { name: /saving throw/i }));
      expect(screen.getByText(/save ability/i)).toBeInTheDocument();
    });

    it('shows the Damage Components section when Attack Roll is toggled on', () => {
      renderOpen();
      expect(screen.queryByRole('button', { name: /\+ add component/i })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox', { name: /attack roll/i }));
      expect(screen.getByRole('button', { name: /\+ add component/i })).toBeInTheDocument();
    });

    it('adds a component row when "+ Add Component" is clicked', () => {
      renderOpen();
      fireEvent.click(screen.getByRole('checkbox', { name: /attack roll/i }));
      fireEvent.click(screen.getByRole('button', { name: /\+ add component/i }));
      expect(screen.getByLabelText(/number of dice/i)).toBeInTheDocument();
    });

    it('removes a component row when the × remove button is clicked', () => {
      renderOpen();
      fireEvent.click(screen.getByRole('checkbox', { name: /attack roll/i }));
      fireEvent.click(screen.getByRole('button', { name: /\+ add component/i }));
      expect(screen.getByLabelText(/number of dice/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /remove component/i }));
      expect(screen.queryByLabelText(/number of dice/i)).not.toBeInTheDocument();
    });

    it('toggles a class checkbox on and off', () => {
      renderOpen();
      const wizardCb = screen.getByRole('checkbox', { name: /^wizard$/i });
      expect(wizardCb).not.toBeChecked();
      fireEvent.click(wizardCb);
      expect(wizardCb).toBeChecked();
      fireEvent.click(wizardCb);
      expect(wizardCb).not.toBeChecked();
    });

    it('hides the Character Level Scaling section for cantrips (level 0)', () => {
      renderOpen();
      // Default is level 1 — the Add Tier button should be present
      expect(screen.getByRole('button', { name: /\+ add tier/i })).toBeInTheDocument();
      // Switch to Cantrip
      fireEvent.change(screen.getByDisplayValue('Level 1'), { target: { value: '0' } });
      expect(screen.queryByText(/character level scaling/i)).not.toBeInTheDocument();
    });

    it('adds a breakpoint tier row when "+ Add Tier" is clicked', () => {
      renderOpen();
      // Section is already visible at level 1
      expect(screen.queryByLabelText(/character level threshold/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /\+ add tier/i }));
      expect(screen.getByLabelText(/character level threshold/i)).toBeInTheDocument();
    });

    it('removes a breakpoint tier row via the ✕ button', () => {
      renderOpen();
      fireEvent.click(screen.getByRole('button', { name: /\+ add tier/i }));
      expect(screen.getByLabelText(/character level threshold/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /remove tier/i }));
      expect(screen.queryByLabelText(/character level threshold/i)).not.toBeInTheDocument();
    });
  });

  // ── Edit mode ─────────────────────────────────────────────────────────────

  describe('edit mode', () => {
    function renderEdit() {
      return renderWithProviders(
        <CreateSpellModal isOpen={true} onClose={noop} spellToEdit={spellToEdit} />
      );
    }

    it('shows the "Edit Spell" title', () => {
      renderEdit();
      expect(screen.getByText(/edit spell/i)).toBeInTheDocument();
    });

    it('pre-fills the Name field with the spell name', () => {
      renderEdit();
      expect(screen.getByDisplayValue('Green-Flame Blade')).toBeInTheDocument();
    });

    it('pre-fills the Description field', () => {
      renderEdit();
      expect(screen.getByDisplayValue(/you brandish/i)).toBeInTheDocument();
    });

    it('shows "Save Changes" button instead of "Create Spell"', () => {
      renderEdit();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create spell/i })).not.toBeInTheDocument();
    });

    it('pre-checks classes from the spell and leaves others unchecked', () => {
      renderEdit();
      expect(screen.getByRole('checkbox', { name: /^wizard$/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /^sorcerer$/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /^cleric$/i })).not.toBeChecked();
    });

    it('pre-populates the char-level breakpoints from the spell', () => {
      renderEdit();
      // spellToEdit has a breakpoint at char level 5, added by spellToFormState
      expect(screen.getByLabelText(/character level threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/character level threshold/i)).toHaveValue(5);
    });
  });

  // ── Submission ────────────────────────────────────────────────────────────

  describe('submission', () => {
    it('calls createSpell.mutateAsync with the form payload on valid submit', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(useCreateSpell).mockReturnValue({ ...stubMutation(), mutateAsync } as any);

      renderWithProviders(<CreateSpellModal isOpen={true} onClose={noop} />);
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Thunderwave/i), {
        target: { value: 'Thunderwave' },
      });
      fireEvent.change(screen.getByPlaceholderText(/enter the spell description/i), {
        target: { value: 'A wave of concussive sound.' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create spell/i }));

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
      const [payload] = mutateAsync.mock.calls[0] as [Record<string, unknown>];
      expect(payload.name).toBe('Thunderwave');
      expect(payload.description).toBe('A wave of concussive sound.');
    });

    it('calls updateSpell.mutateAsync with the spell id on valid submit in edit mode', async () => {
      const mutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(useUpdateSpell).mockReturnValue({ ...stubMutation(), mutateAsync } as any);

      renderWithProviders(
        <CreateSpellModal isOpen={true} onClose={noop} spellToEdit={spellToEdit} />
      );
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
      const [{ id }] = mutateAsync.mock.calls[0] as [{ id: string }];
      expect(id).toBe('spell-edit-1');
    });
  });

  // ── Pending / error states ────────────────────────────────────────────────

  describe('states', () => {
    it('disables the submit button and shows "Inscribing…" while the mutation is pending', () => {
      vi.mocked(useCreateSpell).mockReturnValue(
        stubMutation({ isPending: true }) as any
      );
      renderWithProviders(<CreateSpellModal isOpen={true} onClose={noop} />);
      const btn = screen.getByRole('button', { name: /inscribing/i });
      expect(btn).toBeDisabled();
    });

    it('shows an error alert when the mutation fails', () => {
      vi.mocked(useCreateSpell).mockReturnValue(
        stubMutation({ isError: true }) as any
      );
      renderWithProviders(<CreateSpellModal isOpen={true} onClose={noop} />);
      expect(screen.getByText(/failed to save spell/i)).toBeInTheDocument();
    });

    it('hides the submit button and shows the success message when the mutation succeeds', () => {
      vi.mocked(useCreateSpell).mockReturnValue(
        stubMutation({ isSuccess: true }) as any
      );
      renderWithProviders(<CreateSpellModal isOpen={true} onClose={noop} />);
      expect(screen.queryByRole('button', { name: /create spell/i })).not.toBeInTheDocument();
      expect(screen.getByText(/spell inscribed in the archives/i)).toBeInTheDocument();
    });
  });
});
