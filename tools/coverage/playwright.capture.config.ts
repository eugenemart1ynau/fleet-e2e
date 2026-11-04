import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE, env } from '../../src/config/env';

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

export default defineConfig({
  testDir: __dirname,
  testMatch: /capture\.spec\.ts/,
  globalSetup: require.resolve('../../src/global-setup'),
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  use: { baseURL: env.baseURL, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  projects: [
    { name: 'setup', testDir: '../../tests/ui/setup', testMatch: /auth\.setup\.ts/, use: desktop },
    {
      name: 'capture',
      dependencies: ['setup'],
      use: { ...desktop, storageState: STORAGE_STATE },
    },
  ],
});
