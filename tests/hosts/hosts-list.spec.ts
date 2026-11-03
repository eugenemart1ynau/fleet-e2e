import { test, expect } from '../../src/fixtures';

test.describe('Hosts page – list', () => {
  test('@smoke list loads and matches GET /hosts', async ({ hostsPage, api, page }) => {
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

  test('@smoke host name link navigates to host details', async ({ hostsPage, linuxHost, page }) => {
    await hostsPage.goto();
    await hostsPage.openHost(linuxHost.display_name);
    await expect(page).toHaveURL(new RegExp(`/hosts/${linuxHost.id}/details`));
  });
});
