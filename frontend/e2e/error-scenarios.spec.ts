import { test, expect } from '@playwright/test';

/**
 * Error scenarios — E6
 *
 * Verifies that network failures, empty query results, and client-side form
 * validation errors are correctly surfaced to the user.
 *
 * Tests are grouped into three areas:
 *   1. API failures  — page.route() aborts requests so the app renders its error alert UI
 *   2. Empty results — a search term that matches no spells triggers the empty state
 *   3. Form errors   — client-side validation and server-rejected credentials
 */

// ── 1. API failure simulations (authenticated) ───────────────────────────────

test.describe('Error scenarios — API failures', () => {
  test('spell library shows error alert when the spells API is unreachable', async ({ page }) => {
    // Intercept every request to the spells list endpoint and abort it.
    await page.route(/\/api\/spells\/spells\//, (route) => route.abort('failed'));

    await page.goto('/spells');

    await expect(
      page.getByText('Error loading spells. Please try again.'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('spellbooks page shows error alert when the spellbooks API is unreachable', async ({
    page,
  }) => {
    // Abort the main spellbooks list request.
    await page.route(/\/api\/spellbooks\/$/, (route) => route.abort('failed'));

    await page.goto('/spellbooks');

    await expect(
      page.getByText('Failed to load your data. Please try again.'),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ── 2. Empty search results (authenticated) ──────────────────────────────────

test.describe('Error scenarios — empty results', () => {
  test('spell library shows empty state when a search matches nothing', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByRole('heading', { name: /spell library/i })).toBeVisible({
      timeout: 10_000,
    });

    // Type a string that will never match a real spell name.
    await page.getByPlaceholder(/spell name/i).fill('xyzzy_notasp3ll_xyzzy');

    await expect(page.getByRole('heading', { name: 'No Spells Found' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('No spells match your current filters.')).toBeVisible();
  });
});

// ── 3. Form validation & server errors (unauthenticated) ─────────────────────

test.describe('Error scenarios — form errors', () => {
  // Override storageState for the entire group so these tests run logged-out.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login with wrong credentials shows an error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('nobody@nowhere.invalid');
    await page.getByLabel('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // The app shows either the server-returned detail or the generic fallback.
    await expect(
      page.getByText(/login failed|check your credentials/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('register with mismatched passwords shows a client-side validation error', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByLabel('Email Address').fill('test@example.invalid');
    await page.getByLabel('Password').fill('Password1!');
    await page.getByLabel('Confirm Password').fill('Password2!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('register with a too-short password shows a client-side validation error', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByLabel('Email Address').fill('test@example.invalid');
    await page.getByLabel('Password').fill('short');
    await page.getByLabel('Confirm Password').fill('short');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Password must be at least 8 characters long')).toBeVisible();
  });
});
