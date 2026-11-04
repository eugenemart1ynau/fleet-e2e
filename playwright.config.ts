import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE, env } from './src/config/env';

const API_SPECS = /.*\.api\.spec\.ts/;
const UI_SETUP = /.*\.setup\.ts/;
const UI_READ_ONLY = /\/(smoke|regression|e2e)\/.*\.spec\.ts/;
const UI_E2E = /.*\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./src/global-setup'),
  fullyParallel: false,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,
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
      testDir: './tests/api',
      testMatch: API_SPECS,
      grepInvert: /@destructive/,
      use: { baseURL: env.baseURL, trace: 'off', screenshot: 'off', video: 'off' },
    },
    {
      // Mutating API checks. Depends on the UI destructive project so a full `npm test` never deletes
      // hosts concurrently with read-only specs; run alone with `npm run test:api:destructive` (--no-deps).
      name: 'api-destructive',
      testDir: './tests/api',
      testMatch: API_SPECS,
      grep: /@destructive/,
      dependencies: ['api', 'destructive'],
      use: { baseURL: env.baseURL, trace: 'off', screenshot: 'off', video: 'off' },
    },

    // ---- UI: smoke, regression, and the one e2e journey in Chrome, Firefox, and Safari. Delete last, Chrome only. ----
    // Browsers share the worker pool. WORKERS defaults to 2 because the suite shares one Fleet user.
    // Edit columns is one user setting; the file lock in src/utils/columnLock.ts serializes those
    // tests only. Other specs still assume the default columns, so keep the worker count low.
    // Safari is Playwright WebKit, the engine Safari uses. Chrome is Desktop Chrome (Chromium).
    { name: 'setup', testDir: './tests/ui/setup', testMatch: UI_SETUP, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chrome',
      testDir: './tests/ui',
      testMatch: UI_READ_ONLY,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grepInvert: /@destructive/,
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      testMatch: UI_READ_ONLY,
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grepInvert: /@destructive/,
    },
    {
      name: 'safari',
      testDir: './tests/ui',
      testMatch: UI_READ_ONLY,
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grepInvert: /@destructive/,
    },
    {
      // Host delete. Runs once, in Chrome, after every read-only browser. Not repeated in Firefox or Safari.
      name: 'destructive',
      testDir: './tests/ui/destructive',
      testMatch: UI_E2E,
      grep: /@destructive/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['chrome', 'firefox', 'safari'],
      fullyParallel: false,
      retries: 0,
    },
  ],
});
