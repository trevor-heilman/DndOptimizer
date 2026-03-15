import { test, expect } from '@playwright/test';

/**
 * Compare Page — spell selector, analyze button, and results rendering.
 */
test.describe('Compare Spells', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: /compare spells/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /compare spells/i })).toBeVisible();
  });

  test('renders two spell search inputs', async ({ page }) => {
    const inputs = page.getByPlaceholder(/search spells/i);
    await expect(inputs.first()).toBeVisible();
    await expect(inputs.nth(1)).toBeVisible();
  });

  test('renders the Spell 1 and Spell 2 labels', async ({ page }) => {
    await expect(page.getByText(/🔮 spell 1/i)).toBeVisible();
    await expect(page.getByText(/⚡ spell 2/i)).toBeVisible();
  });

  test('Analyze button is disabled until both spells are selected', async ({ page }) => {
    const analyzeBtn = page.getByRole('button', { name: /🔮 analyze/i });
    await expect(analyzeBtn).toBeDisabled();
  });

  test('can select spells and run an analysis', async ({ page }) => {
    // Wait for the spell list to populate
    const inputA = page.getByPlaceholder(/search spells/i).first();
    await inputA.fill('Fireball');
    await expect(page.getByRole('button', { name: 'Fireball' }).first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Fireball' }).first().click();

    const inputB = page.getByPlaceholder(/search spells/i).nth(1);
    await inputB.fill('Magic Missile');
    await expect(page.getByRole('button', { name: 'Magic Missile' }).first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Magic Missile' }).first().click();

    // Analyze button should now be enabled
    const analyzeBtn = page.getByRole('button', { name: /🔮 analyze/i });
    await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 });
    await analyzeBtn.click();

    // Comparison Results section should appear
    await expect(page.getByRole('heading', { name: /comparison results/i })).toBeVisible({ timeout: 15_000 });
  });
});
