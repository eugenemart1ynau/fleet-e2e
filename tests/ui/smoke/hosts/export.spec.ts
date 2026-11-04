import { test, expect } from '../../../../src/fixtures';
import { csvValue, parseCsv } from '../../../../src/utils/apiData';
import * as fs from 'fs';

/**
 * Action: download the Hosts CSV from the page.
 * Checks: the file matches GET /hosts/report for the same columns.
 * Why: Export hosts is the operator's copy of the table.
 */
test.describe('Hosts page – export CSV', () => {
  /**
   * Action: open /hosts/manage and click Export hosts.
   * Checks: the download name ends in .csv, the row count matches GET /hosts/report?format=csv&columns=display_name,hostname,uuid,status,platform, and the uuids are the same set.
   * Why: the download must be the hosts the table is showing.
   */
  test(
    'Export hosts downloads CSV whose rows match GET /hosts/report',
    { tag: '@smoke' },
    async ({ hostsPage, api, page }) => {
      await hostsPage.goto();

      const apiRes = await api.get('/hosts/report', {
        params: { format: 'csv', columns: 'display_name,hostname,uuid,status,platform' },
      });
      expect(apiRes.ok()).toBeTruthy();
      const apiCsv = parseCsv(await apiRes.text());

      const [download] = await Promise.all([page.waitForEvent('download'), hostsPage.exportButton.click()]);
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);

      const filePath = await download.path();
      expect(filePath, 'download path').toBeTruthy();
      const text = fs.readFileSync(filePath!, 'utf8');
      const uiCsv = parseCsv(text);

      expect(uiCsv.rows.length, 'UI CSV row count').toBe(apiCsv.rows.length);

      expect(uiCsv.rows.map((r) => csvValue(uiCsv.headers, r, 'uuid')).sort()).toEqual(
        apiCsv.rows.map((r) => csvValue(apiCsv.headers, r, 'uuid')).sort(),
      );
    },
  );
});
