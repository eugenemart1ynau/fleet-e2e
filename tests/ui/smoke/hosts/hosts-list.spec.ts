import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open /hosts/manage and follow a host name.
 * Checks: the table matches GET /hosts, and a name opens that host's details.
 * Why: this is the page an operator lands on, and the only way into host details.
 */
test.describe('Hosts page – list', () => {
  /**
   * Action: open /hosts/manage.
   * Checks: the URL has order_key=display_name, the count matches GET /hosts/count, the row count and display names match GET /hosts, and no error toast is showing.
   * Why: this is the table an operator sees on load.
   */
  test('list loads and matches GET /hosts', { tag: '@smoke' }, async ({ hostsPage, api, page }) => {
    const apiHosts = await api.listHosts();
    const apiCount = await api.countHosts();

    await hostsPage.goto();

    await expect(page).toHaveURL(/order_key=display_name/);
    await hostsPage.expectCount(apiCount);
    await expect(hostsPage.hostLinks).toHaveCount(apiHosts.length);

    const uiNames = await hostsPage.hostNames();
    expect(uiNames).toEqual(apiHosts.map((h) => h.display_name));
    await hostsPage.expectNoErrorToast();
  });

  /**
   * Action: open /hosts/manage and click the simulated Linux host's name.
   * Checks: the URL is /hosts/{id}/details for that host.
   * Why: the name is the only entry point to host details.
   */
  test('host name link navigates to host details', { tag: '@smoke' }, async ({ hostsPage, linuxHost, page }) => {
    await hostsPage.goto();
    await hostsPage.openHost(linuxHost.display_name);
    await expect(page).toHaveURL(new RegExp(`/hosts/${linuxHost.id}/details`));
  });
});
