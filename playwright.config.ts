import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE, env } from './src/config/env';

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
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grepInvert: /@destructive/,
    },
    {
      // Mutating tests (delete) run last, serially, after the read-only suite.
      name: 'destructive',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['chromium'],
      grep: /@destructive/,
      fullyParallel: false,
    },
  ],
});
