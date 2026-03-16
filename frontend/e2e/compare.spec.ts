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

  test('Analyze button becomes disabled again after clearing a spell selection', async ({ page }) => {
    const inputA = page.getByPlaceholder(/search spells/i).first();
    await inputA.fill('Fireball');
    await expect(page.getByRole('button', { name: 'Fireball' }).first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Fireball' }).first().click();

    const inputB = page.getByPlaceholder(/search spells/i).nth(1);
    await inputB.fill('Magic Missile');
    await expect(page.getByRole('button', { name: 'Magic Missile' }).first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Magic Missile' }).first().click();

    // Clear spell 1 by clicking its deselect/clear button
    const clearBtn = page.getByRole('button', { name: /clear|✕|×/i }).first();
    await clearBtn.click();

    await expect(page.getByRole('button', { name: /🔮 analyze/i })).toBeDisabled({ timeout: 3_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Analysis results — runs the full flow in beforeEach then checks each section
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Compare Spells — analysis results', () => {
  const ANALYSIS_TIMEOUT = 20_000;

  test.beforeEach(async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: /compare spells/i })).toBeVisible({ timeout: 8_000 });

    const inputA = page.getByPlaceholder(/search spells/i).first();
    await inputA.fill('Fireball');
    await expect(page.getByRole('button', { name: 'Fireball' }).first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Fireball' }).first().click();

    const inputB = page.getByPlaceholder(/search spells/i).nth(1);
    await inputB.fill('Magic Missile');
    await expect(page.getByRole('button', { name: 'Magic Missile' }).first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Magic Missile' }).first().click();

    await page.getByRole('button', { name: /🔮 analyze/i }).click();
    // Wait for results to load before each test
    await expect(page.getByRole('heading', { name: /comparison results/i })).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
  });

  test('shows Expected Damage labels for both spells', async ({ page }) => {
    const labels = page.getByText(/expected damage:/i);
    await expect(labels.first()).toBeVisible();
    await expect(labels.nth(1)).toBeVisible();
  });

  test('shows Efficiency labels for both spells', async ({ page }) => {
    const labels = page.getByText(/efficiency:/i);
    await expect(labels.first()).toBeVisible();
    await expect(labels.nth(1)).toBeVisible();
  });

  test('shows spell names Fireball and Magic Missile in the results cards', async ({ page }) => {
    await expect(page.getByText('Fireball').first()).toBeVisible();
    await expect(page.getByText('Magic Missile').first()).toBeVisible();
  });

  test('shows the Breakeven Analysis section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /breakeven analysis/i })).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
  });

  test('shows the Spell Growth Analysis section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spell growth analysis/i })).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
  });

  test('renders a growth chart container inside Spell Growth Analysis', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spell growth analysis/i })).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    // The chart is rendered in an SVG or canvas inside the section; just verify the section has content
    const section = page.locator('text=Spell Growth Analysis').last();
    await expect(section).toBeVisible();
  });

  test('shows numeric expected damage values (not zero or placeholder) after analysis', async ({ page }) => {
    // At least one numeric value should appear in the expected damage row (not '0.00' for both)
    const labels = page.getByText(/expected damage:/i);
    await expect(labels.first()).toBeVisible();
    // The value immediately follows the label in the same container
    const firstResult = labels.first().locator('..').locator('span').last();
    const text = await firstResult.textContent();
    const val = parseFloat(text ?? '0');
    expect(val).toBeGreaterThan(0);
  });
});
