import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE, env } from './src/config/env';

const API_SPECS = /.*\.api\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./src/global-setup'),
  fullyParallel: false,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 1,
  workers: env.workers,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ---- API (browserless): REST contract + data checks. No storageState, no UI setup. ----
    {
      name: 'api',
      testMatch: API_SPECS,
      grepInvert: /@destructive/,
      use: { baseURL: env.baseURL, trace: 'off', screenshot: 'off', video: 'off' },
    },
    {
      // Mutating API checks. Depends on UI `destructive` so a full `npm test` never deletes
      // hosts concurrently with UI specs; run alone with `npm run test:api:destructive` (--no-deps).
      name: 'api-destructive',
      testMatch: API_SPECS,
      grep: /@destructive/,
      dependencies: ['api', 'destructive'],
      use: { baseURL: env.baseURL, trace: 'off', screenshot: 'off', video: 'off' },
    },

    // ---- UI ----
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: API_SPECS,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grepInvert: /@destructive/,
    },
    {
      // Mutating tests (delete) run last, serially, after the read-only suite.
      name: 'destructive',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      testIgnore: API_SPECS,
      dependencies: ['chromium'],
      grep: /@destructive/,
      fullyParallel: false,
    },
  ],
});
