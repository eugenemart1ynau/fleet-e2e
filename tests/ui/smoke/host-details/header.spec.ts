import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open a simulated Linux host's details header.
 * Checks: the name and status match GET /hosts/:id.
 * Why: the header is the first thing an operator sees after opening a host.
 */
test.describe('Host details – header & summary', () => {
  /**
   * Action: open /hosts/{id}/details for the simulated Linux host.
   * Checks: the display name matches GET /hosts/:id, the document title includes that name, the status text is visible, and Refetch is visible.
   * Why: a wrong name or status on the header means the page is showing the wrong host.
   */
  test('header shows display name and status matching API', { tag: '@smoke' }, async ({ hostDetailsPage, api, linuxHost, page }) => {
    const host = await api.getHost(linuxHost.id);
    await hostDetailsPage.goto(host.id);

    await expect(hostDetailsPage.displayName).toHaveText(host.display_name);
    await expect(page).toHaveTitle(new RegExp(`${host.display_name} \\| Hosts`));
    await expect(page.getByText(new RegExp(`^${host.status}$`, 'i')).first()).toBeVisible();
    await expect(hostDetailsPage.refetchButton).toBeVisible();
  });
});
