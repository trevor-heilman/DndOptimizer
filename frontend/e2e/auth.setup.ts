import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Auth setup — logs in once and saves storageState so all other tests
 * can reuse the session without re-authenticating.
 *
 * Required environment variables (set in .env.e2e or your shell):
 *   E2E_EMAIL    — email of the test account
 *   E2E_PASSWORD — password of the test account
 *
 * PowerShell:  $env:E2E_EMAIL="you@example.com"; $env:E2E_PASSWORD="yourpassword"
 * Bash/WSL:    export E2E_EMAIL=you@example.com E2E_PASSWORD=yourpassword
 * File:        copy .env.e2e.example to .env.e2e and fill in values (auto-loaded by config)
 */

const authFile = path.join(import.meta.dirname, '../playwright/.auth/user.json');

const EMAIL    = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error(
    '\n[E2E] Missing required environment variables: E2E_EMAIL and E2E_PASSWORD\n' +
    'Set them before running Playwright tests:\n\n' +
    '  PowerShell : $env:E2E_EMAIL="you@example.com"; $env:E2E_PASSWORD="yourpassword"\n' +
    '  Bash/WSL   : export E2E_EMAIL=you@example.com E2E_PASSWORD=yourpassword\n' +
    '  .env.e2e   : copy frontend/.env.e2e.example to frontend/.env.e2e and fill in values\n'
  );
}

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  // The login form uses email + password inputs
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|enter|log in/i }).click();

  // Wait until we land on the home/dashboard page
  await expect(page).toHaveURL('/', { timeout: 10_000 });

  // Persist localStorage (access token) and cookies for downstream tests
  await page.context().storageState({ path: authFile });
});
