/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules', 'e2e/**'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        '**/*.d.ts',
      ],
      thresholds: {
        // TODO: Raise thresholds as page-level unit tests are filled in.
        // Current actual coverage (2026-03-16): lines 54%, funcs 42%, branches 52%, stmts 51%.
        // Page test files exist as minimal stubs; coverage will rise as they are expanded.
        lines: 52,
        functions: 40,
        branches: 50,
        statements: 49,
      },
    },
  },
});
