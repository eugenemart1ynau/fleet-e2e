import { test, expect } from '../../../../src/fixtures';

/**
 * Action: choose Linux in the Hosts platform filter.
 * Checks: the page moves to /hosts/manage/labels/:id and the table matches that label.
 * Why: the platform menu is how an operator narrows the fleet by OS.
 */
test.describe('Hosts page – platform / label filter', () => {
  /**
   * Action: open /hosts/manage and choose Linux.
   * Checks: the URL is /hosts/manage/labels/{id}, the count matches GET /hosts/count?label_id=, the display names match GET /labels/:id/hosts, and none of those hosts are darwin or windows.
   * Why: Linux is the platform filter used against the simulated hosts.
   */
  test('Linux platform filter navigates to label hosts and matches API count', { tag: '@smoke' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByPlatformOrLabel('Linux');

    const labelId = hostsPage.labelIdFromUrl();
    expect(labelId, 'URL includes /labels/:id').toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`/hosts/manage/labels/${labelId}`));

    const count = await api.countHosts({ label_id: labelId! });
    await hostsPage.expectCount(count);

    const hosts = await api.listLabelHosts(labelId!);
    expect(await hostsPage.hostNames()).toEqual(hosts.map((h) => h.display_name));
    for (const h of hosts) {
      expect(h.platform).not.toBe('darwin');
      expect(h.platform).not.toBe('windows');
    }
  });
});
