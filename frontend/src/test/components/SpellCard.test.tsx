/**
 * Unit tests for the SpellCard component.
 */
import { screen } from '@testing-library/react';
import { SpellCard } from '../../components/SpellCard';
import { renderWithProviders } from '../utils/render';
import { mockSpell } from '../mocks/handlers';

describe('SpellCard', () => {
  it('renders the spell name', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    expect(screen.getByText('Fireball')).toBeInTheDocument();
  });

  it('renders the correct level text', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    expect(screen.getByText('Level 3')).toBeInTheDocument();
  });

  it('renders "Cantrip" for level 0 spells', () => {
    renderWithProviders(<SpellCard spell={{ ...mockSpell, level: 0 } as any} />);
    expect(screen.getByText('Cantrip')).toBeInTheDocument();
  });

  it('renders school name capitalised', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    expect(screen.getByText('Evocation')).toBeInTheDocument();
  });

  it('shows Concentration badge when spell is concentration', () => {
    renderWithProviders(<SpellCard spell={{ ...mockSpell, concentration: true } as any} />);
    expect(screen.getByText('◎ Conc')).toBeInTheDocument();
  });

  it('does not show Concentration badge for non-concentration spells', () => {
    renderWithProviders(<SpellCard spell={{ ...mockSpell, concentration: false } as any} />);
    expect(screen.queryByText('◎ Conc')).not.toBeInTheDocument();
  });

  it('shows Ritual label when spell is a ritual', () => {
    renderWithProviders(<SpellCard spell={{ ...mockSpell, ritual: true } as any} />);
    expect(screen.getByText('Ritual')).toBeInTheDocument();
  });

  it('links to the correct spell detail URL', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/spells/${mockSpell.id}`);
  });

  it('renders damage components', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    expect(screen.getByText('8d6 fire')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    expect(screen.getByText(/bright streak/i)).toBeInTheDocument();
  });

  it('renders casting time and range', () => {
    renderWithProviders(<SpellCard spell={mockSpell as any} />);
    expect(screen.getByText(/1 action/)).toBeInTheDocument();
    expect(screen.getByText(/150 feet/)).toBeInTheDocument();
  });
});
