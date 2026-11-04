import * as fs from 'fs';
import { Page } from '@playwright/test';
import { test, expect } from '../../../../src/fixtures';
import { csvValue, NO_MATCH_HOST_QUERY, parseCsv } from '../../../../src/utils/apiData';
import { FleetApiClient } from '../../../../src/api/FleetApiClient';
import { HostsPage } from '../../../../src/pages/HostsPage';

const COLUMNS = 'display_name,hostname,uuid,status,platform';

async function downloadCsv(page: Page, hostsPage: HostsPage) {
  const [download] = await Promise.all([page.waitForEvent('download'), hostsPage.exportButton.click()]);
  const filePath = await download.path();
  expect(filePath, 'download path').toBeTruthy();
  return parseCsv(fs.readFileSync(filePath!, 'utf8'));
}

async function reportCsv(api: FleetApiClient, params: Record<string, string>) {
  const apiRes = await api.get('/hosts/report', { params: { format: 'csv', columns: COLUMNS, ...params } });
  expect(apiRes.ok()).toBeTruthy();
  return parseCsv(await apiRes.text());
}

function uuids(csv: { headers: string[]; rows: string[][] }): string[] {
  return csv.rows.map((r) => csvValue(csv.headers, r, 'uuid')).sort();
}

/**
 * Action: export the Hosts table while it is filtered, and export a search that matches nothing.
 * Checks: the CSV rows match GET /hosts/report for Online and for the Linux label. A miss hides Export hosts.
 * Why: Export has to follow the table the operator is looking at, not the whole fleet.
 */
test.describe('Hosts page – export CSV', () => {
  /**
   * Action: choose Online hosts and click Export hosts.
   * Checks: the CSV uuids match GET /hosts/report?format=csv&status=online for the same columns.
   * Why: a filtered export that returns every host is the wrong file.
   */
  test('export while Online matches the filtered report', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Online hosts');
    const apiCsv = await reportCsv(api, { status: 'online' });
    const uiCsv = await downloadCsv(page, hostsPage);
    expect(uuids(uiCsv)).toEqual(uuids(apiCsv));
  });

  /**
   * Action: choose Linux and click Export hosts.
   * Checks: the CSV uuids match GET /hosts/report?format=csv&label_id= for that label.
   * Why: a platform filter has to narrow the file the same way it narrows the table.
   */
  test('export while Linux matches the label report', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByPlatformOrLabel('Linux');
    const labelId = hostsPage.labelIdFromUrl();
    expect(labelId).toBeTruthy();
    const apiCsv = await reportCsv(api, { label_id: String(labelId) });
    const uiCsv = await downloadCsv(page, hostsPage);
    expect(uuids(uiCsv)).toEqual(uuids(apiCsv));
  });

  /**
   * Action: search for the shared no-match query.
   * Checks: the empty state is shown and Export hosts is not on the page.
   * Why: a miss replaces the toolbar export, so the unfiltered fleet cannot be downloaded from that screen.
   */
  test('export is hidden after a no-match search', { tag: '@regression' }, async ({ hostsPage }) => {
    await hostsPage.goto();
    await hostsPage.searchFor(NO_MATCH_HOST_QUERY);
    await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    await expect(hostsPage.exportButton).toBeHidden();
  });
});
