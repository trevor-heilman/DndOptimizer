import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE_PATH = path.join(import.meta.dirname, 'fixtures', 'import-test-spells.json');

/** Name must match the fixture JSON — used to verify the spell appears in the library. */
const TEST_SPELL_NAME = 'E2E Test — Arcane Volt';

/**
 * Spell Import — upload JSON, paste JSON, verify preview, import, and search.
 *
 * The fixture adds one spell per run; duplicates are allowed by the backend so
 * repeated runs remain safe.  Search assertions check `.first()` to tolerate
 * multiple copies from earlier runs.
 */

// ── Modal UI ──────────────────────────────────────────────────────────────────

test.describe('Spell Import — modal UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /import json/i }).click();
    await expect(page.getByRole('heading', { name: /import spells/i })).toBeVisible();
  });

  test('opens with Upload File tab active and a file input', async ({ page }) => {
    await expect(page.getByRole('button', { name: /upload file/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /paste json/i })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('Cancel button closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /import spells/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test('switching to Paste JSON tab shows a textarea and Parse JSON button', async ({ page }) => {
    await page.getByRole('button', { name: /paste json/i }).click();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: /parse json/i })).toBeVisible();
  });

  test('shows a parse error when pasting malformed JSON', async ({ page }) => {
    await page.getByRole('button', { name: /paste json/i }).click();
    await page.locator('textarea').fill('{ not: valid json !!! }');
    await page.getByRole('button', { name: /parse json/i }).click();
    await expect(page.getByText(/invalid json/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows a parse error when pasted JSON contains no spells', async ({ page }) => {
    await page.getByRole('button', { name: /paste json/i }).click();
    await page.locator('textarea').fill('{}');
    await page.getByRole('button', { name: /parse json/i }).click();
    // Modal should report that no spells were found
    await expect(page.getByText(/no spells found/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── File upload flow ──────────────────────────────────────────────────────────

test.describe('Spell Import — file upload flow', () => {
  test('shows the parsed-spell preview count before importing', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /import json/i }).click();
    await expect(page.getByRole('heading', { name: /import spells/i })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);

    // Preview message — "1 spell found and ready to import"
    await expect(page.getByText(/1 spell.*found and ready to import/i)).toBeVisible({ timeout: 8_000 });

    // Import button label should reflect the count
    await expect(page.getByRole('button', { name: /import 1 spell/i })).toBeVisible();
  });

  test('imports the fixture file and shows the success message', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /import json/i }).click();
    await expect(page.getByRole('heading', { name: /import spells/i })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
    await expect(page.getByText(/1 spell.*found and ready to import/i)).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /import 1 spell/i }).click();

    // Success banner
    await expect(page.getByText(/successfully imported.*1/i)).toBeVisible({ timeout: 15_000 });

    // Footer changes to Close + Import Another
    await expect(page.getByRole('button', { name: /close/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /import another/i })).toBeVisible();
  });

  test('imported spell is searchable in the library after closing the modal', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });

    // Import
    await page.getByRole('button', { name: /import json/i }).click();
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
    await expect(page.getByText(/1 spell.*found and ready to import/i)).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: /import 1 spell/i }).click();
    await expect(page.getByText(/successfully imported.*1/i)).toBeVisible({ timeout: 15_000 });

    // Close
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('heading', { name: /import spells/i })).not.toBeVisible({ timeout: 5_000 });

    // Search for the spell in the library
    await page.getByPlaceholder(/spell name/i).fill(TEST_SPELL_NAME);
    await expect(page.getByText(TEST_SPELL_NAME).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Paste JSON flow ───────────────────────────────────────────────────────────

test.describe('Spell Import — paste JSON flow', () => {
  const PASTE_SPELL_NAME = `E2E Paste Spell ${Date.now()}`;

  test('parses pasted JSON and imports successfully', async ({ page }) => {
    await page.goto('/spells');
    await expect(page.getByText(/\d+ spells/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /import json/i }).click();
    await page.getByRole('button', { name: /paste json/i }).click();

    const json = JSON.stringify([
      { name: PASTE_SPELL_NAME, level: 2, school: 'illusion' },
    ]);
    await page.locator('textarea').fill(json);
    await page.getByRole('button', { name: /parse json/i }).click();

    await expect(page.getByText(/1 spell.*found and ready to import/i)).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: /import 1 spell/i }).click();
    await expect(page.getByText(/successfully imported.*1/i)).toBeVisible({ timeout: 15_000 });
  });
});
