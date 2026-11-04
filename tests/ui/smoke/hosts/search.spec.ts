import { test, expect } from '../../../../src/fixtures';

/**
 * Action: search the Hosts page by a real host name.
 * Checks: the table count matches GET /hosts?query= and that host stays visible.
 * Why: typing a hostname is the primary lookup.
 */
test.describe('Hosts page – search', () => {
  /**
   * Action: open /hosts/manage and search for the simulated Linux host's display name.
   * Checks: the count matches GET /hosts?query= for that name, and that host's link is visible.
   * Why: typing a hostname is the primary lookup.
   */
  test(
    'search by hostname narrows list and syncs ?query=',
    { tag: '@smoke' },
    async ({ hostsPage, api, linuxHost }) => {
      await hostsPage.goto();
      await hostsPage.searchFor(linuxHost.display_name);

      const expected = await api.listHosts({ query: linuxHost.display_name });
      await hostsPage.expectCount(expected.length);
      await expect(hostsPage.hostLink(linuxHost.display_name)).toBeVisible();
    },
  );
});
