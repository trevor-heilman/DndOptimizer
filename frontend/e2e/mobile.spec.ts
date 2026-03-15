import { test, expect } from '@playwright/test';

/**
 * Mobile viewport smoke tests — 375 × 812 (iPhone SE / 12 mini)
 *
 * Verifies that key flows are accessible and core content renders correctly
 * at a narrow viewport.  Navigation happens via goto() because the nav bar
 * links are hidden on mobile (hidden sm:flex Tailwind class).
 */

// Apply 375px viewport to every test in this file.
test.use({ viewport: { width: 375, height: 812 } });

// ── Unauthenticated flows ─────────────────────────────────────────────────────

test.describe('Mobile — auth (unauthenticated)', () => {
  // Override the default storageState so we are NOT logged in.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page heading is visible at 375px', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /enter the vault/i })).toBeVisible();
  });

  test('login form fields and submit button are usable at 375px', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|enter|log in/i })).toBeVisible();
  });

  test('unauthenticated navigation redirects to /login', async ({ page }) => {
    await page.goto('/spells');
    await expect(page).toHaveURL(/\/login/);
  });

  test('register page link is reachable from the login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /claim your tome/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

// ── Authenticated flows ───────────────────────────────────────────────────────

test.describe('Mobile — layout (authenticated)', () => {
  test('brand logo is visible at 375px', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByRole('link', { name: /spellwright/i })).toBeVisible({ timeout: 8_000 });
  });

  test('desktop nav links are hidden at 375px', async ({ page }) => {
    await page.goto('/spells');
    // Nav links use "hidden sm:flex" — they must NOT be visible at 375px
    await expect(page.getByRole('link', { name: /^spells$/i })).not.toBeVisible();
  });

  test('logout button is accessible at 375px', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Mobile — spell library (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByRole('heading', { name: /spell library/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spell library/i })).toBeVisible();
  });

  test('spell count renders after load', async ({ page }) => {
    await expect(page.getByText(/\d+ spells?/i)).toBeVisible({ timeout: 10_000 });
  });

  test('search input is accessible and usable', async ({ page }) => {
    const search = page.getByPlaceholder(/spell name/i);
    await expect(search).toBeVisible();
    await search.fill('Fireball');
    await expect(page.getByText('Fireball').first()).toBeVisible({ timeout: 8_000 });
  });

  test('clicking a spell card navigates to its detail page', async ({ page }) => {
    await expect(page.getByText(/fireball/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByText(/fireball/i).first().click();
    await expect(page).toHaveURL(/\/spells\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('heading', { name: /fireball/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('no horizontal overflow (page width stays within viewport)', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // allow 1px rounding
  });
});

test.describe('Mobile — spellbooks library (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spellbooks');
    await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible();
  });

  test('New Character button is visible at 375px', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new character/i })).toBeVisible();
  });

  test('Bind New Tome button is visible at 375px', async ({ page }) => {
    await expect(page.getByRole('button', { name: /bind new tome/i })).toBeVisible();
  });

  test('no horizontal overflow on spellbooks page', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe('Mobile — compare page (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: /compare spells/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('page heading is visible at 375px', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /compare spells/i })).toBeVisible();
  });

  test('spell selection inputs render at 375px', async ({ page }) => {
    await expect(page.getByPlaceholder(/search spell/i).first()).toBeVisible();
  });

  test('no horizontal overflow on compare page', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
