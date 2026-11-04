import { test as base, expect } from '@playwright/test';
import { FleetApiClient } from '../api/FleetApiClient';
import type { Host } from '../api/types';
import { HostDetailsPage } from '../pages/HostDetailsPage';
import { HostsPage } from '../pages/HostsPage';
import { LoginPage } from '../pages/LoginPage';
import { pickLinuxHost } from '../utils/hostPicker';
import { useApiClient } from './apiClient';

type TestFixtures = {
  loginPage: LoginPage;
  hostsPage: HostsPage;
  hostDetailsPage: HostDetailsPage;
  /** A read-only online simulated Linux host (don't mutate it). */
  linuxHost: Host;
};

type WorkerFixtures = {
  api: FleetApiClient;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  api: [async ({}, use) => useApiClient(use), { scope: 'worker' }],
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  hostsPage: async ({ page }, use) => use(new HostsPage(page)),
  hostDetailsPage: async ({ page }, use) => use(new HostDetailsPage(page)),
  linuxHost: async ({ api }, use) => {
    const hosts = await api.listHosts();
    await use(pickLinuxHost(hosts));
  },
});

export { expect };
