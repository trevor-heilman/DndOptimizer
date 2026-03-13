/**
 * Tests for the RegisterPage component.
 */
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, defaultAuthValue } from '../utils/render';
import { RegisterPage } from '../../pages/RegisterPage';

describe('RegisterPage', () => {
  it('renders email, password, and confirm-password fields with a submit button', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders a link back to the login page', () => {
    renderWithProviders(<RegisterPage />);
    const link = screen.getByRole('link', { name: /return to the vault/i });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('shows a password mismatch error without calling register()', async () => {
    const registerMock = vi.fn();
    renderWithProviders(<RegisterPage />, {
      authValue: { ...defaultAuthValue, register: registerMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wizard@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('shows a short-password error without calling register()', async () => {
    const registerMock = vi.fn();
    renderWithProviders(<RegisterPage />, {
      authValue: { ...defaultAuthValue, register: registerMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wizard@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('calls register() with email, password, and confirmation on valid submit', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RegisterPage />, {
      authValue: { ...defaultAuthValue, register: registerMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith('new@test.com', 'password123', 'password123');
    });
  });

  it('shows an error message when registration fails with field errors', async () => {
    const registerMock = vi.fn().mockRejectedValue({
      response: { data: { email: ['This email is already registered.'] } },
    });
    renderWithProviders(<RegisterPage />, {
      authValue: { ...defaultAuthValue, register: registerMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'taken@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email:/i)).toBeInTheDocument();
    });
  });

  it('shows a fallback error message when registration fails without response data', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('Network error'));
    renderWithProviders(<RegisterPage />, {
      authValue: { ...defaultAuthValue, register: registerMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it('disables the submit button and shows loading text while registration is in progress', async () => {
    const registerMock = vi.fn().mockReturnValue(new Promise(() => {}));
    renderWithProviders(<RegisterPage />, {
      authValue: { ...defaultAuthValue, register: registerMock },
    });

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /inscribing your name/i })
      ).toBeDisabled();
    });
  });
});
