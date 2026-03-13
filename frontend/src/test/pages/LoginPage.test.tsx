/**
 * Tests for the LoginPage component.
 */
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, defaultAuthValue } from '../utils/render';
import { LoginPage } from '../../pages/LoginPage';

describe('LoginPage', () => {
  it('renders email and password fields with a submit button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderWithProviders(<LoginPage />);
    const link = screen.getByRole('link', { name: /claim your tome/i });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('calls login() with email and password on form submit', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<LoginPage />, {
      authValue: { ...defaultAuthValue, login: loginMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wizard@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('wizard@test.com', 'secret123');
    });
  });

  it('shows the API error message when login fails with a detail field', async () => {
    const loginMock = vi.fn().mockRejectedValue({
      response: { data: { detail: 'Invalid credentials.' } },
    });
    renderWithProviders(<LoginPage />, {
      authValue: { ...defaultAuthValue, login: loginMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wizard@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument();
    });
  });

  it('shows a fallback error message when login fails without response data', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LoginPage />, {
      authValue: { ...defaultAuthValue, login: loginMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wizard@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'badpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('disables the submit button and shows loading text while login is in progress', async () => {
    const loginMock = vi.fn().mockReturnValue(new Promise(() => {}));
    renderWithProviders(<LoginPage />, {
      authValue: { ...defaultAuthValue, login: loginMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wizard@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /channeling magic/i })).toBeDisabled();
    });
  });
});
