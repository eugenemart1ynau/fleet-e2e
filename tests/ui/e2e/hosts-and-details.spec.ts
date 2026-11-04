import { env } from '../../../src/config/env';
import { expect, test } from '../../../src/fixtures';

/**
 * Action: log in, walk from Hosts through one host's tabs and back, then sign out.
 * Checks: a fresh browser reaches both pages, and Sign out ends the session.
 * Why: this is the one operator session across Hosts and host details.
 */
test.describe('Hosts and host details', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Action: log in, choose Online hosts, open the simulated Linux host, read Details, dismiss Delete, open Policies, Reports, and Software, click Back to all hosts, then Sign out.
   * Checks: the details URL, title, header, and status match GET /hosts/:id, and Activity, User, and one label are visible. Escape closes Delete and the host is still 200. Policies and Reports show their empty copy. The Software count matches GET /hosts/:id/software. Back returns to /hosts/manage with status=online. Sign out lands on /login, and /hosts/manage redirects there. No other account-menu or Actions item is clicked.
   * Why: the session must start at the login form, inspect the host, and end when the operator signs out, without dropping the Online filter or deleting the host.
   */
  test('login, inspect an online host, and sign out', { tag: '@regression' }, async ({ loginPage, hostsPage, hostDetailsPage, api, linuxHost, page }) => {
    test.setTimeout(90_000);
    const host = await api.getHost(linuxHost.id);
    const software = await api.getHostSoftware(linuxHost.id);

    await loginPage.goto();
    await loginPage.login(env.email, env.password);
    await page.waitForLoadState('load');
    await hostsPage.goto();

    await hostsPage.filterByStatus('Online hosts');
    await expect(page).toHaveURL(/status=online/);
    await expect(hostsPage.heading).toBeVisible();
    await hostsPage.openHost(host.display_name);

    await expect(page).toHaveURL(new RegExp(`/hosts/${host.id}/details`));
    await expect(hostDetailsPage.displayName).toHaveText(host.display_name);
    await expect(page).toHaveTitle(new RegExp(`${host.display_name} \\| Hosts`));
    await expect(page.getByText(new RegExp(`^${host.status}$`, 'i')).first()).toBeVisible();
    await expect(hostDetailsPage.activityHeading).toBeVisible();
    await expect(hostDetailsPage.activityCopy()).toBeVisible();
    await expect(hostDetailsPage.userHeading).toBeVisible();
    await expect(hostDetailsPage.userIdpLabel()).toBeVisible();
    await expect(hostDetailsPage.labelsHeading).toBeVisible();
    const shown = host.labels.filter((l) => l.name !== 'All Hosts' && l.name !== 'All Linux').map((l) => l.name);
    expect(shown.length, 'host has a label chip besides All Hosts and All Linux').toBeGreaterThan(0);
    await hostDetailsPage.expectOneLabelVisible(shown);

    await hostDetailsPage.actionsDropdown.click();
    const del = hostDetailsPage.actionOption('Delete');
    await expect(del).toBeVisible();
    await del.click();
    await hostDetailsPage.deleteModal.expectOpen();
    await page.keyboard.press('Escape');
    await hostDetailsPage.deleteModal.expectClosed();
    expect(await api.getHostStatusCode(host.id)).toBe(200);

    await hostDetailsPage.openTab('Policies');
    await expect(page).toHaveURL(new RegExp(`/hosts/${host.id}/policies`));
    await expect(hostDetailsPage.policiesCount()).toBeVisible();
    await expect(hostDetailsPage.policiesEmptyCopy()).toBeVisible();

    await hostDetailsPage.openTab('Reports');
    await expect(page).toHaveURL(new RegExp(`/hosts/${host.id}/(queries|reports)`));
    await expect(hostDetailsPage.reportsCount()).toBeVisible();
    await expect(hostDetailsPage.reportsEmptyCopy()).toBeVisible();

    await hostDetailsPage.openTab('Software');
    await expect(page).toHaveURL(new RegExp(`/hosts/${host.id}/software`));
    expect(software.count, 'host has not reported software yet').toBeGreaterThan(0);
    await expect(hostDetailsPage.softwareCount(software.count)).toBeVisible();

    await hostDetailsPage.backToAllHosts();
    await expect(page).toHaveURL(/\/hosts\/manage/);
    await expect(page).toHaveURL(/status=online/);
    await expect(hostsPage.statusFilter).toBeVisible();

    await page.getByTestId('user-menu').getByRole('combobox').focus();
    await page.keyboard.press('ArrowDown');
    await page.locator('[id*="-option-"]').filter({ hasText: /^Sign out$/ }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/hosts/manage');
    await expect(page).toHaveURL(/\/login/);
  });
});
