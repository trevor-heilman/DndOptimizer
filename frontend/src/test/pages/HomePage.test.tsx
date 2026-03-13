/**
 * Tests for the HomePage component.
 */
import { screen } from '@testing-library/react';
import { renderWithProviders, defaultAuthValue, unauthenticatedAuthValue } from '../utils/render';
import { HomePage } from '../../pages/HomePage';

describe('HomePage', () => {
  it('renders the Spellwright heading', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('heading', { name: /spellwright/i })).toBeInTheDocument();
  });

  it('renders the D&D 5e subtitle', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/d&d 5e spell analysis/i)).toBeInTheDocument();
  });

  it('shows a Spell Library card linking to /spells', () => {
    renderWithProviders(<HomePage />);
    const link = screen.getByRole('link', { name: /spell library/i });
    expect(link).toHaveAttribute('href', '/spells');
  });

  it('shows a Spellbooks card linking to /spellbooks', () => {
    renderWithProviders(<HomePage />);
    // Use getAllByRole since "Spellbooks" text also appears in descriptions
    const links = screen.getAllByRole('link', { name: /spellbooks/i });
    const spellbooksLink = links.find((l) => l.getAttribute('href') === '/spellbooks');
    expect(spellbooksLink).toBeInTheDocument();
  });

  it('shows a Compare Spells card linking to /compare', () => {
    renderWithProviders(<HomePage />);
    const link = screen.getByRole('link', { name: /compare spells/i });
    expect(link).toHaveAttribute('href', '/compare');
  });

  it('does not show the sign-up prompt when the user is authenticated', () => {
    renderWithProviders(<HomePage />, { authValue: defaultAuthValue });
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument();
  });

  it('shows the sign-up prompt with a link to /register when logged out', () => {
    renderWithProviders(<HomePage />, { authValue: unauthenticatedAuthValue });
    const link = screen.getByRole('link', { name: /create an account/i });
    expect(link).toHaveAttribute('href', '/register');
  });
});
