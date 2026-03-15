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

  // ── Source badge ────────────────────────────────────────────────────────────

  it('renders abbreviated source badge for known sources', () => {
    const spell = { ...mockSpell, source: "Xanathar's Guide to Everything" };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.getByText('XGtE')).toBeInTheDocument();
  });

  it('renders "PHB 2014" abbreviation for Player\'s Handbook (2014)', () => {
    const spell = { ...mockSpell, source: "Player's Handbook (2014)" };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.getByText('PHB 2014')).toBeInTheDocument();
  });

  it('renders "TCoE" abbreviation for Tasha\'s Cauldron of Everything', () => {
    const spell = { ...mockSpell, source: "Tasha's Cauldron of Everything" };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.getByText('TCoE')).toBeInTheDocument();
  });

  it('truncates unknown long source names to 10 chars + ellipsis', () => {
    const spell = { ...mockSpell, source: 'Homebrew Collection Volume 2' };
    renderWithProviders(<SpellCard spell={spell as any} />);
    // Falls back to spell.source.slice(0,10) + '…'
    expect(screen.getByText('Homebrew C…')).toBeInTheDocument();
  });

  it('renders short unknown source name as-is (≤10 chars)', () => {
    const spell = { ...mockSpell, source: 'Custom' };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders no source badge when source is absent', () => {
    const spell = { ...mockSpell, source: undefined };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.queryByText('XGtE')).not.toBeInTheDocument();
    expect(screen.queryByText('PHB')).not.toBeInTheDocument();
  });

  // ── Gameplay tags ───────────────────────────────────────────────────────────

  it('renders gameplay tags when present', () => {
    const spell = { ...mockSpell, tags: ['damage', 'aoe'] };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.getByText('Damage')).toBeInTheDocument();
    expect(screen.getByText('Aoe')).toBeInTheDocument();
  });

  it('renders no tag pills when tags list is empty', () => {
    const spell = { ...mockSpell, tags: [] };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.queryByText('Damage')).not.toBeInTheDocument();
  });

  it('renders "Crowd Control" tag with spaces for crowd_control', () => {
    const spell = { ...mockSpell, tags: ['crowd_control'] };
    renderWithProviders(<SpellCard spell={spell as any} />);
    expect(screen.getByText('Crowd Control')).toBeInTheDocument();
  });

  // ── Multiple damage components ──────────────────────────────────────────────

  it('renders up to 3 damage component chips', () => {
    const spell = {
      ...mockSpell,
      damage_components: [
        { id: 'dc-1', dice_count: 8, die_size: 6, flat_modifier: 0, damage_type: 'fire',     timing: 'on_fail', is_verified: true },
        { id: 'dc-2', dice_count: 1, die_size: 10, flat_modifier: 0, damage_type: 'cold',    timing: 'on_fail', is_verified: true },
        { id: 'dc-3', dice_count: 2, die_size: 6,  flat_modifier: 0, damage_type: 'thunder', timing: 'on_fail', is_verified: true },
        { id: 'dc-4', dice_count: 4, die_size: 4,  flat_modifier: 0, damage_type: 'acid',    timing: 'on_hit',  is_verified: true },
      ],
    };
    renderWithProviders(<SpellCard spell={spell as any} />);
    // Only first 3 are rendered
    expect(screen.getByText('8d6 fire')).toBeInTheDocument();
    expect(screen.getByText('1d10 cold')).toBeInTheDocument();
    expect(screen.getByText('2d6 thunder')).toBeInTheDocument();
    expect(screen.queryByText('4d4 acid')).not.toBeInTheDocument();
  });
});
