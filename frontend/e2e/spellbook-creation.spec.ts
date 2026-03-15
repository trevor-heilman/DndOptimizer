import { test, expect } from '@playwright/test';

/**
 * Spellbook Creation Flow
 *
 * Tests the full lifecycle:
 *   1. Create a character via the New Character modal
 *   2. Create a spellbook via the Bind New Tome modal
 *   3. Navigate to a spellbook detail page
 *   4. Add a spell via the Add Spells picker
 *   5. End-to-end: create char + book → navigate → add spell → verify
 *
 * All data-creating tests use a timestamp-derived suffix so repeated runs on the
 * same live account do not collide.  Tests that require pre-existing data use
 * test.skip() if none is present.
 */

// ── helpers ───────────────────────────────────────────────────────────────────

async function goToLibrary(page: import('@playwright/test').Page) {
  await page.goto('/spellbooks');
  await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible({ timeout: 8_000 });
}

// ── Create character ──────────────────────────────────────────────────────────

test.describe('Create character modal', () => {
  test.beforeEach(async ({ page }) => { await goToLibrary(page); });

  test('opens with the correct title and closes on Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /new character/i }).click();
    await expect(page.getByRole('heading', { name: /new character/i })).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /new character/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test('creates a new character and shows it on the shelf', async ({ page }) => {
    const charName = `E2E Hero ${Date.now()}`;

    await page.getByRole('button', { name: /new character/i }).click();
    await expect(page.getByRole('heading', { name: /new character/i })).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder(/alara brightweave/i).fill(charName);
    // Choose wizard so the character has a recognisable class badge
    await page.locator('select').first().selectOption('wizard');

    await page.getByRole('button', { name: /create character/i }).click();

    // Modal must close
    await expect(page.getByRole('heading', { name: /new character/i })).not.toBeVisible({ timeout: 8_000 });

    // New character shelf heading is visible
    await expect(page.getByText(charName)).toBeVisible({ timeout: 10_000 });
  });
});

// ── Create spellbook ──────────────────────────────────────────────────────────

test.describe('Create spellbook modal', () => {
  test.beforeEach(async ({ page }) => { await goToLibrary(page); });

  test('opens with the correct title and closes on Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /bind new tome/i }).click();
    await expect(page.getByRole('heading', { name: /new spellbook/i })).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /new spellbook/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test('creates a new spellbook and shows the card on the shelf', async ({ page }) => {
    const bookName = `E2E Tome ${Date.now()}`;

    await page.getByRole('button', { name: /bind new tome/i }).click();
    await expect(page.getByRole('heading', { name: /new spellbook/i })).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder(/my wizard's spellbook/i).fill(bookName);

    await page.getByRole('button', { name: /^create$/i }).click();

    // Modal must close
    await expect(page.getByRole('heading', { name: /new spellbook/i })).not.toBeVisible({ timeout: 8_000 });

    // Spellbook card link appears with the correct accessible name
    await expect(
      page.getByRole('link', { name: new RegExp(`open spellbook: ${bookName}`, 'i') }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ── Spellbook detail navigation ────────────────────────────────────────────────

test.describe('Spellbook detail page', () => {
  test.beforeEach(async ({ page }) => { await goToLibrary(page); });

  test('navigates to the detail page when a book card is clicked', async ({ page }) => {
    const bookLinks = page.getByRole('link', { name: /open spellbook:/i });
    if (await bookLinks.count() === 0) { test.skip(); return; }

    await bookLinks.first().click();

    await expect(page).toHaveURL(/\/spellbooks\/[a-zA-Z0-9-]+/, { timeout: 8_000 });
    // Spellbook name appears as the page h1
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });
  });

  test('shows the Add Spells button on the detail page', async ({ page }) => {
    const bookLinks = page.getByRole('link', { name: /open spellbook:/i });
    if (await bookLinks.count() === 0) { test.skip(); return; }

    await bookLinks.first().click();
    await expect(page).toHaveURL(/\/spellbooks\/[a-zA-Z0-9-]+/, { timeout: 8_000 });

    await expect(page.getByRole('button', { name: /add spells/i })).toBeVisible({ timeout: 8_000 });
  });
});

// ── Add spell picker ───────────────────────────────────────────────────────────

test.describe('Add Spells picker', () => {
  test.beforeEach(async ({ page }) => { await goToLibrary(page); });

  test('opens the picker and filters by spell name', async ({ page }) => {
    const bookLinks = page.getByRole('link', { name: /open spellbook:/i });
    if (await bookLinks.count() === 0) { test.skip(); return; }

    await bookLinks.first().click();
    await expect(page).toHaveURL(/\/spellbooks\/[a-zA-Z0-9-]+/, { timeout: 8_000 });

    await page.getByRole('button', { name: /add spells/i }).click();
    await expect(page.getByRole('heading', { name: /add spells/i })).toBeVisible({ timeout: 8_000 });

    // Search narrows the list to Fireball results
    await page.getByPlaceholder(/search by name/i).fill('Fireball');
    await expect(page.getByText('Fireball').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('heading', { name: /add spells/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test('adds a spell and the row flips to ✓ Added', async ({ page }) => {
    const bookLinks = page.getByRole('link', { name: /open spellbook:/i });
    if (await bookLinks.count() === 0) { test.skip(); return; }

    await bookLinks.first().click();
    await expect(page).toHaveURL(/\/spellbooks\/[a-zA-Z0-9-]+/, { timeout: 8_000 });

    await page.getByRole('button', { name: /add spells/i }).click();
    await expect(page.getByRole('heading', { name: /add spells/i })).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder(/search by name/i).fill('Fireball');
    await expect(page.getByText('Fireball').first()).toBeVisible({ timeout: 8_000 });

    // If Fireball is already in this book the button shows ✓ Added — still a pass.
    const addButton = page.getByRole('button', { name: /^\+ add$/i }).first();
    const alreadyAdded = (await addButton.count()) === 0;

    if (!alreadyAdded) {
      await addButton.click();
      await expect(page.getByRole('button', { name: /✓ added/i }).first()).toBeVisible({ timeout: 8_000 });
    } else {
      await expect(page.getByRole('button', { name: /✓ added/i }).first()).toBeVisible();
    }
  });
});

// ── End-to-end lifecycle ───────────────────────────────────────────────────────

test.describe('Full spellbook lifecycle', () => {
  test('create character + spellbook, navigate to detail, add a spell, verify it appears', async ({ page }) => {
    const id = Date.now();
    const charName = `E2E Mage ${id}`;
    const bookName = `Arcane Codex ${id}`;

    // ─ 1. Create character ─────────────────────────────────────────────────
    await goToLibrary(page);

    await page.getByRole('button', { name: /new character/i }).click();
    await expect(page.getByRole('heading', { name: /new character/i })).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder(/alara brightweave/i).fill(charName);
    await page.locator('select').first().selectOption('wizard');

    await page.getByRole('button', { name: /create character/i }).click();
    await expect(page.getByRole('heading', { name: /new character/i })).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(charName)).toBeVisible({ timeout: 10_000 });

    // ─ 2. Create spellbook ─────────────────────────────────────────────────
    await page.getByRole('button', { name: /bind new tome/i }).click();
    await expect(page.getByRole('heading', { name: /new spellbook/i })).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder(/my wizard's spellbook/i).fill(bookName);
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByRole('heading', { name: /new spellbook/i })).not.toBeVisible({ timeout: 8_000 });

    const bookLink = page.getByRole('link', { name: new RegExp(`open spellbook: ${bookName}`, 'i') });
    await expect(bookLink).toBeVisible({ timeout: 10_000 });

    // ─ 3. Navigate to detail ───────────────────────────────────────────────
    await bookLink.click();
    await expect(page).toHaveURL(/\/spellbooks\/[a-zA-Z0-9-]+/, { timeout: 8_000 });
    await expect(
      page.getByRole('heading', { level: 1, name: new RegExp(bookName, 'i') }),
    ).toBeVisible({ timeout: 8_000 });

    // ─ 4. Add a spell ──────────────────────────────────────────────────────
    await page.getByRole('button', { name: /add spells/i }).click();
    await expect(page.getByRole('heading', { name: /add spells/i })).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder(/search by name/i).fill('Fireball');
    await expect(page.getByText('Fireball').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /^\+ add$/i }).first().click();
    await expect(page.getByRole('button', { name: /✓ added/i }).first()).toBeVisible({ timeout: 8_000 });

    // ─ 5. Close picker and verify spell is in the book ─────────────────────
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: /add spells/i })).not.toBeVisible({ timeout: 5_000 });

    // Fireball should now appear in the spellbook's spell grid
    await expect(page.getByText('Fireball').first()).toBeVisible({ timeout: 10_000 });
  });
});
