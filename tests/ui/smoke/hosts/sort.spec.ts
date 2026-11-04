import { test, expect } from '../../../../src/fixtures';

/**
 * Action: sort the Hosts table from the Operating system header.
 * Checks: the URL order params and the display-name order match GET /hosts for that sort.
 * Why: the header click is how an operator sorts the fleet.
 */
test.describe('Hosts page – column sort', () => {
  /**
   * Action: open /hosts/manage and click the Operating system header twice.
   * Checks: the first click sets order_key=os_version and order_direction=asc, and the names match that API order. The second click sets order_direction=desc, and the names match that API order.
   * Why: the header click is the sort control on the table.
   */
  test(
    'Operating system header sorts and toggles order_direction',
    { tag: '@smoke' },
    async ({ hostsPage, api, page }) => {
      await hostsPage.goto();
      await hostsPage.sortByColumn('Operating system');
      await expect(page).toHaveURL(/order_key=os_version/);
      await expect(page).toHaveURL(/order_direction=asc/);

      const asc = await api.listHosts({ order_key: 'os_version', order_direction: 'asc' });
      expect(await hostsPage.hostNames()).toEqual(asc.map((h) => h.display_name));

      await hostsPage.sortByColumn('Operating system');
      await expect(page).toHaveURL(/order_direction=desc/);
      const desc = await api.listHosts({ order_key: 'os_version', order_direction: 'desc' });
      expect(await hostsPage.hostNames()).toEqual(desc.map((h) => h.display_name));
    },
  );
});
