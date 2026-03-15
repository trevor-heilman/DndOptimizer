import { test, expect } from '@playwright/test';

/**
 * Auth flows — login, redirect behaviour, logout.
 * These tests do NOT use the saved storageState so they can test
 * the unauthenticated state.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test('shows the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /enter the vault/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('shows an error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nobody@nowhere.com');
    await page.getByLabel(/password/i).first().fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|enter|log in/i }).click();
    await expect(page.getByText(/login failed|invalid|credentials/i)).toBeVisible({
      timeout: 8_000,
    });
  });

  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/spells');
    await expect(page).toHaveURL(/\/login/);
  });

  test('navigates to register page via link', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /claim your tome/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
