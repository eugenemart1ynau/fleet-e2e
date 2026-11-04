import { test, expect } from '../../../../src/fixtures';
import { withHostColumnLock } from '../../../../src/utils/columnLock';

/**
 * Action: hide a Hosts column from Edit columns and reload.
 * Checks: the column leaves the table and hidden_host_columns records it. The setting is cleared afterward.
 * Why: column visibility is stored on the user, not only in the browser.
 */
test.describe('Hosts page – edit columns', () => {
  /**
   * Action: clear hidden columns, open /hosts/manage, hide Hardware model, reload, then clear the setting again.
   * Checks: the hardware_model header is visible first, gone after save, present in GET hidden_host_columns, and still gone after reload.
   * Why: Edit columns must survive a refresh.
   */
  test('hiding a column persists via hidden_host_columns', { tag: '@smoke' }, async ({ hostsPage, api, page }) => {
    await withHostColumnLock(async () => {
    await api.setHiddenHostColumns([]);
    await hostsPage.goto();
    await expect(hostsPage.columnHeader('hardware_model')).toBeVisible();

    try {
      await hostsPage.toggleColumnAndSave('Hardware model');
      await expect(hostsPage.columnHeader('hardware_model')).toHaveCount(0);
      expect(await api.getHiddenHostColumns()).toContain('hardware_model');

      await page.reload();
      await hostsPage.waitForLoaded();
      await expect(hostsPage.columnHeader('hardware_model')).toHaveCount(0);
    } finally {
      await api.setHiddenHostColumns([]);
    }
    });
  });
});
