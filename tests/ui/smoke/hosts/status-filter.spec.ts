import { test, expect } from '../../../../src/fixtures';

/**
 * Action: choose Online hosts in the Hosts status filter.
 * Checks: the URL gains ?status=online and the count matches GET /hosts/count.
 * Why: Online is the status an operator checks first.
 */
test.describe('Hosts page – status filter', () => {
  /**
   * Action: open /hosts/manage and choose Online hosts.
   * Checks: the URL contains status=online, and the count matches GET /hosts/count?status=online.
   * Why: Online is the status an operator checks first.
   */
  test('Online filter matches API and syncs ?status=online', { tag: '@smoke' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Online hosts');
    await expect(page).toHaveURL(/status=online/);

    const online = await api.countHosts({ status: 'online' });
    await hostsPage.expectCount(online);
  });
});
