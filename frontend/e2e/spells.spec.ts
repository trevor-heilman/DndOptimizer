import { test, expect } from '@playwright/test';

/**
 * Spell Library — browse, search, filter, and navigate to a spell detail page.
 */
test.describe('Spell Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spells');
    // Wait for spell cards to load (API response)
    await expect(page.getByRole('heading', { name: /spell library/i })).toBeVisible();
  });

  test('renders the page heading and action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create spell/i })).toBeVisible();
  });

  test('shows a result count after spells load', async ({ page }) => {
    // e.g. "417 spells" or "56 spells"
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });
  });

  test('search by spell name narrows results', async ({ page }) => {
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder(/spell name/i).fill('Fireball');
    // Wait for the debounced request
    await expect(page.getByText('Fireball').first()).toBeVisible({ timeout: 8_000 });
    // Result count should update
    await expect(page.getByText(/\d+ spell/i)).toBeVisible();
  });

  test('clicking a spell card navigates to the detail page', async ({ page }) => {
    // Wait for at least one card to appear
    const firstCard = page.getByText(/fireball/i).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/spells\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('heading', { name: /fireball/i })).toBeVisible({ timeout: 8_000 });
  });

  test('shows empty state when search yields no results', async ({ page }) => {
    await page.getByPlaceholder(/spell name/i).fill('zzznomatchzzz');
    await expect(page.getByText(/no spells found/i)).toBeVisible({ timeout: 8_000 });
  });
});
