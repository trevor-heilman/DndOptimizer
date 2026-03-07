/**
 * Unit tests for the AnalysisContextForm component.
 */
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { AnalysisContextForm } from '../../components/AnalysisContextForm';
import type { AnalysisContext } from '../../types/api';

const defaultContext: AnalysisContext = {
  target_ac: 15,
  caster_attack_bonus: 5,
  spell_save_dc: 15,
  target_save_bonus: 0,
  number_of_targets: 1,
  advantage: false,
  disadvantage: false,
  spell_slot_level: 3,
  crit_enabled: false,
  half_damage_on_save: true,
  evasion_enabled: false,
};

describe('AnalysisContextForm', () => {
  it('renders all expected field labels', () => {
    renderWithProviders(
      <AnalysisContextForm context={defaultContext} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText(/target ac/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spell attack bonus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spell save dc/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target save bonus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of targets/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spell slot level/i)).toBeInTheDocument();
  });

  it('displays the current context values', () => {
    renderWithProviders(
      <AnalysisContextForm context={defaultContext} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText(/target ac/i)).toHaveValue(15);
    expect(screen.getByLabelText(/spell attack bonus/i)).toHaveValue(5);
    expect(screen.getByLabelText(/spell save dc/i)).toHaveValue(15);
    expect(screen.getByLabelText(/number of targets/i)).toHaveValue(1);
  });

  it('calls onChange with updated target_ac when the field changes', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AnalysisContextForm context={defaultContext} onChange={onChange} />
    );
    const input = screen.getByLabelText(/target ac/i);
    fireEvent.change(input, { target: { value: '18' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target_ac: 18 })
    );
  });

  it('calls onChange with updated number_of_targets', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AnalysisContextForm context={defaultContext} onChange={onChange} />
    );
    const input = screen.getByLabelText(/number of targets/i);
    fireEvent.change(input, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ number_of_targets: 3 })
    );
  });

  it('preserves other context fields when one field changes', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AnalysisContextForm context={defaultContext} onChange={onChange} />
    );
    const input = screen.getByLabelText(/target ac/i);
    fireEvent.change(input, { target: { value: '12' } });
    const callArg = onChange.mock.calls[0][0] as AnalysisContext;
    expect(callArg.spell_save_dc).toBe(15);
    expect(callArg.caster_attack_bonus).toBe(5);
  });
});
