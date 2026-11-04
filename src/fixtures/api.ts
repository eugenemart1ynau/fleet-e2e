import { test as base, expect } from '@playwright/test';
import { FleetApiClient } from '../api/FleetApiClient';
import type { Host } from '../api/types';
import { pickLinuxHost } from '../utils/hostPicker';
import { useApiClient } from './apiClient';

/**
 * Fixtures for the browserless `api` projects. Kept separate from the UI fixtures
 * so API specs never pull in page objects or a browser.
 */
type ApiTestFixtures = {
  /** Client with no Authorization header. */
  anonApi: FleetApiClient;
  /** Snapshot of every host page at test start. */
  allHosts: Host[];
  /** A read-only online simulated Linux host — same pick as the UI suite. Don't mutate it. */
  knownHost: Host;
};

type ApiWorkerFixtures = {
  /** Admin-authenticated client (Bearer token), one login per worker. */
  api: FleetApiClient;
};

export const test = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  api: [async ({}, use) => useApiClient(use), { scope: 'worker' }],
  anonApi: async ({}, use) => {
    const anon = await FleetApiClient.anonymous();
    await use(anon);
    await anon.dispose();
  },
  allHosts: async ({ api }, use) => use(await api.listAllHosts()),
  knownHost: async ({ allHosts }, use) => use(pickLinuxHost(allHosts)),
});

export { expect };
