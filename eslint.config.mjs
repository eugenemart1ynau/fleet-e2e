import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'coverage-dashboard/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      'tools/coverage/dashboard.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Playwright worker fixtures take `{}` when they use no other fixture.
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'tools/coverage/capture.spec.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Login backs off on Fleet's 429 toast, and a few specs wait for a URL the click writes.
      'playwright/no-wait-for-timeout': 'off',
      // A skipped API case is a missing field on this preview, and the message says why.
      'playwright/no-skipped-test': 'off',
      'playwright/no-conditional-in-test': 'off',
      // Status loops pick @smoke or @regression from the case. Helpers call expect.
      'playwright/valid-test-tags': 'off',
      'playwright/expect-expect': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/prefer-to-have-length': 'off',
    },
  },
);
