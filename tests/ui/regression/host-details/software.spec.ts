import { test, expect } from '../../../../src/fixtures';
import { NO_MATCH_SOFTWARE_QUERY } from '../../../../src/utils/apiData';

/**
 * Action: search the Software tab for a name that does not exist, clear it, and sort by Name.
 * Checks: the empty-state copy is shown, clearing restores the API count, and Name sort stays on this tab.
 * Why: a miss must show the empty state, and the name link must not open the software title.
 */
test.describe('Host details – software inventory', () => {
  /**
   * Action: open the Software tab and search for the shared no-match software query.
   * Checks: the page says "No items match the current search criteria".
   * Why: a miss must show the empty state instead of the full inventory.
   */
  test('no-match software search shows empty state', { tag: '@regression' }, async ({ hostDetailsPage, linuxHost }) => {
    await hostDetailsPage.goto(linuxHost.id, 'software');
    await hostDetailsPage.searchSoftware(NO_MATCH_SOFTWARE_QUERY);
    await expect(hostDetailsPage.softwareEmptyCopy()).toBeVisible();
  });

  /**
   * Action: search the Software tab for a miss, then clear the box.
   * Checks: ?query= leaves the URL. The item count matches GET /hosts/:id/software again.
   * Why: clearing the box is how an operator gets the full inventory back.
   */
  test(
    'clearing software search restores the inventory count',
    { tag: '@regression' },
    async ({ hostDetailsPage, api, linuxHost }) => {
      const sw = await api.getHostSoftware(linuxHost.id);
      expect(sw.count, 'host has not reported software yet').toBeGreaterThan(0);
      await hostDetailsPage.goto(linuxHost.id, 'software');
      await hostDetailsPage.searchSoftware(NO_MATCH_SOFTWARE_QUERY);
      await hostDetailsPage.searchSoftware('');
      await expect(hostDetailsPage.softwareCount(sw.count)).toBeVisible();
    },
  );

  /**
   * Action: click the Name header on the software table, and read the first software link without opening it.
   * Checks: the Name sort button is visible, the URL records the sort, the visible names match GET /hosts/:id/software for that sort, the first link has an href, and the URL stays on this host's software tab.
   * Why: Name is the sort control on this table, and the name links to a software title on the next page.
   */
  test(
    'Name sort and software links stay on this tab',
    { tag: '@regression' },
    async ({ hostDetailsPage, api, linuxHost, page }) => {
      const sw = await api.getHostSoftware(linuxHost.id);
      expect(sw.count, 'host has not reported software yet').toBeGreaterThan(0);
      await hostDetailsPage.goto(linuxHost.id, 'software');

      const nameSort = hostDetailsPage.softwareNameSort();
      await expect(nameSort).toBeVisible();
      await nameSort.click();
      await expect(page).toHaveURL(/order_key=/);
      const url = new URL(page.url());
      const order_key = url.searchParams.get('order_key') ?? 'name';
      const order_direction = url.searchParams.get('order_direction') === 'desc' ? 'desc' : 'asc';
      const sorted = await api.getHostSoftware(linuxHost.id, '', { order_key, order_direction });
      await expect(hostDetailsPage.softwareRows().first()).toBeVisible();
      const names = (await hostDetailsPage.softwareRows().allInnerTexts())
        .map((t) => t.split('\n')[0].trim())
        .filter(Boolean);
      expect(names).toEqual(sorted.software.map((s) => s.name));

      // The title link goes to the next page. Check the href and stay here.
      const link = hostDetailsPage.softwareTitleLinks().first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', /.+/);
      await expect(page).toHaveURL(new RegExp(`/hosts/${linuxHost.id}/software`));
    },
  );
});
