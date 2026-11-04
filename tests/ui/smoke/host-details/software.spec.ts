import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open the Software tab and search for a real name.
 * Checks: the item count matches GET /hosts/:id/software and the search shows that name.
 * Why: software inventory is the headline content of host details.
 */
test.describe('Host details – software inventory', () => {
  /**
   * Action: open the Software tab for the simulated Linux host and search for the first software name.
   * Checks: the "{count} item(s)" label matches GET /hosts/:id/software. The URL gains query={name}, and that name is visible in a cell. Fails when the host has reported no software yet.
   * Why: the count and the search box are what an operator uses on this tab.
   */
  test('inventory count matches API and search filters', { tag: '@smoke' }, async ({ hostDetailsPage, api, linuxHost }) => {
    const sw = await api.getHostSoftware(linuxHost.id);
    expect(sw.count, 'host has not reported software yet').toBeGreaterThan(0);

    await hostDetailsPage.goto(linuxHost.id, 'software');
    await expect(hostDetailsPage.softwareCount(sw.count)).toBeVisible();

    const target = sw.software[0].name;
    await hostDetailsPage.searchSoftware(target);
    await expect(hostDetailsPage.softwareCell(target)).toBeVisible();
  });
});
