import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open the Vitals section on a simulated Linux host.
 * Checks: the OS version and primary IP on the page match GET /hosts/:id.
 * Why: vitals are the hardware facts an operator trusts on this host.
 */
test.describe('Host details – vitals', () => {
  /**
   * Action: open /hosts/{id}/details for the simulated Linux host.
   * Checks: the Vitals card shows the os_version from GET /hosts/:id, and the Private IP row shows primary_ip.
   * Why: a mismatched OS or IP means the details page is not this host.
   */
  test('Vitals show OS and hardware matching API', { tag: '@smoke' }, async ({ hostDetailsPage, api, linuxHost }) => {
    const host = await api.getHost(linuxHost.id);
    await hostDetailsPage.goto(host.id);
    await expect(hostDetailsPage.vitalsCard).toBeVisible();
    await expect(hostDetailsPage.vital('Operating system')).toContainText(host.os_version);
    expect(host.primary_ip, 'linux host primary_ip').toBeTruthy();
    await expect(hostDetailsPage.vital('Private IP address')).toContainText(host.primary_ip);
  });
});
