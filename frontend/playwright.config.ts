import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Load credentials from .env.e2e if present (file is gitignored)
if (existsSync('.env.e2e')) {
  for (const line of readFileSync('.env.e2e', 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#\s=][^=]*?)\s*=\s*(.*?)\s*$/);
    if (match) {
      const [, key, value] = match;
      // Don't override vars already set in the environment
      if (!(key in process.env)) {
        process.env[key] = value.replace(/^(['"])(.*)\1$/, '$2');
      }
    }
  }
}

/**
 * Playwright configuration for Spellwright end-to-end tests.
 *
 * Tests run against the live stack at http://localhost/
 * Start the stack first with: .\scripts\start.ps1
 *
 * Required environment variables (set in .env.e2e or your shell):
 *   E2E_EMAIL    — test account email
 *   E2E_PASSWORD — test account password
 *
 * Copy .env.e2e.example to .env.e2e and fill in your values.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // All authenticated tests use this saved session
    storageState: 'playwright/.auth/user.json',
    // Suppress Chrome's password manager save/update/leak popups during tests
    launchOptions: {
      args: [
        '--disable-features=PasswordLeakDetection',
        '--disable-password-manager-reauthentication',
        '--password-store=basic',
      ],
    },
  },

  projects: [
    // ── Auth setup — runs first, saves localStorage state ──────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Main test suite — reuses saved auth state ──────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
