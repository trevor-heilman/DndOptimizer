import { test, expect } from '@playwright/test';

/**
 * Spell Detail — DPR Analysis
 *
 * Tests the AnalysisContextForm + "⚡ Analyze" flow on a real damage-dealing
 * spell (Fireball). All tests navigate to Fireball via the spell library so
 * they remain independent of the spell's UUID.
 */

// ── helpers ───────────────────────────────────────────────────────────────────

/** Navigate to the Fireball detail page via the spell library search. */
async function goToFireball(page: import('@playwright/test').Page) {
  await page.goto('/spells');
  await page.getByPlaceholder(/spell name/i).fill('Fireball');
  // Wait for the exact card title to appear (avoids "Delayed Blast Fireball")
  await expect(
    page.getByRole('heading', { name: /^fireball$/i }).first()
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole('heading', { name: /^fireball$/i }).first().click();
  await expect(page).toHaveURL(/\/spells\/[a-zA-Z0-9-]+/);
  // Use .first() — the detail page may show a related-spell card with the same heading
  await expect(
    page.getByRole('heading', { name: /^fireball$/i }).first()
  ).toBeVisible({ timeout: 8_000 });
}

/** Select a Spell Slot Level and click ⚡ Analyze, then wait for results. */
async function runAnalysis(
  page: import('@playwright/test').Page,
  slotLevel: string,
  timeout = 15_000
) {
  await page.getByLabel(/spell slot level/i).selectOption(slotLevel);
  await page.getByRole('button', { name: /^⚡ analyze$/i }).click();
  await expect(page.getByText(/analysis results/i)).toBeVisible({ timeout });
}

// ── Combat Parameters section ─────────────────────────────────────────────────

test.describe('Spell Detail — Combat Parameters', () => {
  test.beforeEach(async ({ page }) => {
    await goToFireball(page);
  });

  test('shows the Combat Parameters section heading', async ({ page }) => {
    await expect(page.getByText(/combat parameters/i)).toBeVisible();
  });

  test('shows Spellcasting Mod and Spell Save DC inputs for a save spell', async ({ page }) => {
    // target_ac is only rendered for attack-roll spells; Fireball is a save spell
    // spellcasting_ability_modifier and spell_save_dc are always visible for save spells
    await expect(page.locator('#spellcasting_ability_modifier')).toBeVisible();
    await expect(page.locator('#spell_save_dc')).toBeVisible();
  });

  test('shows the Spell Slot Level selector', async ({ page }) => {
    await expect(page.getByLabel(/spell slot level/i)).toBeVisible();
  });

  test('shows the ⚡ Analyze button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^⚡ analyze$/i })).toBeVisible();
  });
});

// ── Analysis results ──────────────────────────────────────────────────────────

test.describe('Spell Detail — Analysis Results', () => {
  test.beforeEach(async ({ page }) => {
    await goToFireball(page);
  });

  test('running Analyze at slot 3 shows the Analysis Results section', async ({ page }) => {
    await runAnalysis(page, '3');
    await expect(page.getByText(/analysis results/i)).toBeVisible();
  });

  test('shows Expected Damage stat after analysis', async ({ page }) => {
    await runAnalysis(page, '3');
    await expect(page.getByText(/expected damage/i)).toBeVisible();
  });

  test('shows a Math Breakdown section after analysis', async ({ page }) => {
    await runAnalysis(page, '3');
    // Math Breakdown is always rendered for damage-component spells
    await expect(page.getByText(/math breakdown/i)).toBeVisible({ timeout: 10_000 });
  });

  test('shows a numeric damage value in the results', async ({ page }) => {
    await runAnalysis(page, '3');
    // Damage values are rendered as gold-coloured numbers; .first() avoids strict mode
    await expect(page.locator('.text-gold-400').first()).toBeVisible({ timeout: 5_000 });
  });

  test('upcasting Fireball to slot 5 still produces results', async ({ page }) => {
    await runAnalysis(page, '3');
    await expect(page.getByText(/analysis results/i)).toBeVisible();

    // Re-run at a higher slot
    await runAnalysis(page, '5');
    await expect(page.getByText(/expected damage/i)).toBeVisible();
  });
});

// ── Slot level controls ───────────────────────────────────────────────────────

test.describe('Spell Detail — Slot Level Controls', () => {
  test.beforeEach(async ({ page }) => {
    await goToFireball(page);
  });

  test('Spell Slot Level select accepts values from 3 to 9 for Fireball', async ({ page }) => {
    const select = page.getByLabel(/spell slot level/i);
    // Minimum for Fireball is 3 — selecting it should not error
    await select.selectOption('3');
    await expect(select).toHaveValue('3');

    await select.selectOption('9');
    await expect(select).toHaveValue('9');
  });

  test('changing slot level after an analysis reruns and refreshes results', async ({ page }) => {
    // First analysis at slot 3
    await runAnalysis(page, '3');
    await expect(page.getByText(/expected damage/i)).toBeVisible();

    // Change to slot 5 and re-analyze
    await page.getByLabel(/spell slot level/i).selectOption('5');
    await page.getByRole('button', { name: /^⚡ analyze$/i }).click();

    // Results section must still be present after re-run
    await expect(page.getByText(/analysis results/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/expected damage/i)).toBeVisible();
  });
});

// ── Advanced options ──────────────────────────────────────────────────────────

test.describe('Spell Detail — Advanced Analysis Options', () => {
  test.beforeEach(async ({ page }) => {
    await goToFireball(page);
  });

  test('Advanced toggle reveals additional analysis fields', async ({ page }) => {
    await page.getByRole('button', { name: /advanced/i }).click();
    // At least one advanced field (Critical Hit Rule or Re-roll Mechanic) should appear
    // Multiple advanced fields may match — use .first() to avoid strict mode
    await expect(
      page.getByText(/critical hit rule|re-roll mechanic|elemental adept/i).first()
    ).toBeVisible({ timeout: 3_000 });
  });

  test('analysis with Half damage on save enabled still returns results', async ({ page }) => {
    // Fireball is a save-based spell so this checkbox should be visible
    const halfDamage = page.getByLabel(/half damage on save/i);
    await expect(halfDamage).toBeVisible();
    await halfDamage.check();

    await runAnalysis(page, '3');
    await expect(page.getByText(/expected damage/i)).toBeVisible();
  });
});
