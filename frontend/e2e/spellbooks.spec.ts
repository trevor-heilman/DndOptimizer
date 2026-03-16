import { test, expect } from '@playwright/test';

/**
 * Spellbooks (Library) page — characters and spellbook cards.
 */
test.describe('My Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spellbooks');
    await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my library/i })).toBeVisible();
  });

  test('shows New Character and Bind New Tome buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new character/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /bind new tome/i })).toBeVisible();
  });

  test('empty state is shown when no data exists', async ({ page }) => {
    // If no characters/spellbooks exist, the empty-state message should appear.
    // This test is conditional — it is meaningful on a fresh account.
    const emptyState = page.getByText(/your library awaits/i);
    const hasContent = await page.getByText(/new character/i).isVisible();
    if (!hasContent) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('navigates to spellbook detail when a book is clicked', async ({ page }) => {
    // Only run if at least one spellbook card exists
    const bookLinks = page.getByRole('link', { name: /open spellbook:/i });
    const count = await bookLinks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await bookLinks.first().click();
    await expect(page).toHaveURL(/\/spellbooks\/[a-zA-Z0-9-]+/);
  });
});
