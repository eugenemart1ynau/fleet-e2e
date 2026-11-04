import { Page } from '@playwright/test';
import { test, expect } from '../../../../src/fixtures';
import { HostsPage } from '../../../../src/pages/HostsPage';
import { FleetApiClient } from '../../../../src/api/FleetApiClient';
import { withHostColumnLock } from '../../../../src/utils/columnLock';

const SORTS: Array<{ label: string; key: string; invert?: boolean }> = [
  { label: 'Host', key: 'display_name' },
  { label: 'Last fetched', key: 'detail_updated_at', invert: true },
  { label: 'Disk space available', key: 'gigs_disk_space_available' },
  { label: 'Last restarted', key: 'last_restarted_at', invert: true },
  { label: 'Hostname', key: 'hostname' },
  { label: 'Hardware model', key: 'hardware_model' },
  { label: 'UUID', key: 'uuid' },
  { label: 'Serial number', key: 'hardware_serial' },
  { label: 'RAM', key: 'memory' },
  { label: 'MAC address', key: 'primary_mac' },
  { label: 'Issues', key: 'issues' },
  { label: 'Computer name', key: 'computer_name' },
  { label: 'Private IP address', key: 'primary_ip' },
  { label: 'Public IP address', key: 'public_ip' },
  { label: 'Last seen', key: 'seen_time', invert: true },
  { label: 'Added to Fleet', key: 'last_enrolled_at', invert: true },
];

async function expectSortedNames(
  hostsPage: HostsPage,
  api: FleetApiClient,
  page: Page,
  label: string,
  key: string,
  invert = false,
): Promise<void> {
  await expect(page, label).toHaveURL(new RegExp(`order_key=${key}`));
  const dir = new URL(page.url()).searchParams.get('order_direction');
  expect(dir === 'asc' || dir === 'desc', label).toBeTruthy();
  const apiDir = invert ? (dir === 'asc' ? 'desc' : 'asc') : (dir as 'asc' | 'desc');
  const expected = (await api.listHosts({ order_key: key, order_direction: apiDir })).map((h) => h.display_name);
  await expect.poll(async () => hostsPage.hostNames(), { message: label }).toEqual(expected);
}

/**
 * Action: open the Hosts page from a hostname sort deep link.
 * Checks: the URL keeps the sort params and the names match GET /hosts.
 * Why: a shared sort link must arrive already sorted.
 */
test.describe('Hosts page – column sort', () => {
  /**
   * Action: open /hosts/manage?order_key=hostname&order_direction=desc directly.
   * Checks: the URL keeps both params, and the display names match GET /hosts with that sort.
   * Why: a shared sort link must arrive already sorted.
   */
  test('deep link order_key=hostname&order_direction=desc matches API', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto({ order_key: 'hostname', order_direction: 'desc' });
    await expect(page).toHaveURL(/order_key=hostname/);
    await expect(page).toHaveURL(/order_direction=desc/);
    const expected = (await api.listHosts({ order_key: 'hostname', order_direction: 'desc' })).map((h) => h.display_name);
    await expect.poll(async () => hostsPage.hostNames()).toEqual(expected);
  });

  /**
   * Action: show every column, click each sortable header once, including Operating system and Agent when that header is a sort button, and check Status, User email, and CPU.
   * Checks: the URL order_key matches that column. Names match GET /hosts. Operating system uses the order_key the click writes. Last fetched, Last seen, Last restarted, and Added to Fleet are compared with the direction flipped. The three non-sort headers have no sort button. A rejected Agent sort fails. hidden_host_columns is restored.
   * Why: each column header is its own sort control. Time-ago columns store the opposite direction from the arrow.
   */
  test('each sortable header matches the API', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    test.setTimeout(180_000);
    await withHostColumnLock(() => sortEveryHeader(hostsPage, api, page));
  });
});

async function sortEveryHeader(hostsPage: HostsPage, api: FleetApiClient, page: Page): Promise<void> {
  const before = await api.getHiddenHostColumns();
  try {
    await api.setHiddenHostColumns([]);
    await hostsPage.goto();

    for (const col of SORTS) {
      await hostsPage.clickSortHeader(col.label, col.key);
      await expectSortedNames(hostsPage, api, page, col.label, col.key, col.invert);
    }

    const beforeOs = new URL(page.url()).searchParams.get('order_key');
    await hostsPage.clickSortHeader('Operating system', undefined, beforeOs);
    const osKey = new URL(page.url()).searchParams.get('order_key');
    expect(osKey, 'Operating system').toBeTruthy();
    await expectSortedNames(hostsPage, api, page, 'Operating system', osKey!);

    const agent = hostsPage.columnHeaderButton('Agent');
    if (await agent.count()) {
      await hostsPage.clickSortHeader('Agent');
      const key = new URL(page.url()).searchParams.get('order_key');
      const dir = new URL(page.url()).searchParams.get('order_direction');
      expect(key, 'Agent order_key').toBeTruthy();
      expect(dir === 'asc' || dir === 'desc', 'Agent order_direction').toBeTruthy();
      await expectSortedNames(hostsPage, api, page, 'Agent', key!, false);
    }

    for (const label of ['Status', 'User email', 'CPU']) {
      const th = hostsPage.columnHeaderCell(label);
      await expect(th, label).toBeVisible();
      await expect(th.locator('button.sortable-header'), label).toHaveCount(0);
    }
  } finally {
    await api.setHiddenHostColumns(before.length ? before : []);
  }
}
