import { test, expect } from '../../../../src/fixtures';

/**
 * Action: read the rest of the Vitals card on a simulated Linux host.
 * Checks: Private IP, Public IP, MAC, serial, and Processor type rows are on the Vitals card. A non-empty API value is inside that row. Added to Fleet, Last restarted, Memory, and Disk space available are visible.
 * Why: the smoke test only checks the OS version and the primary IP.
 */
test.describe('Host details – vitals', () => {
  /**
   * Action: open /hosts/{id}/details for the simulated Linux host.
   * Checks: each of those rows is visible on the Vitals card. When GET /hosts/:id has a value other than blank or "---", that row contains it. Added to Fleet, Last restarted, Memory, and Disk space available are visible.
   * Why: those are the other facts on the same card.
   */
  test('remaining vitals match the host payload', { tag: '@regression' }, async ({ hostDetailsPage, api, linuxHost }) => {
    const host = await api.getHost(linuxHost.id);
    await hostDetailsPage.goto(host.id);

    const pairs: Array<[string, string | undefined]> = [
      ['Private IP address', host.primary_ip],
      ['Public IP address', host.public_ip],
      ['MAC address', host.primary_mac],
      ['Serial number', host.hardware_serial],
      ['Processor type', host.cpu_type],
    ];
    for (const [label, value] of pairs) {
      const row = hostDetailsPage.vital(label);
      await expect(row, label).toBeVisible();
      if (value && value !== '---') await expect(row, label).toContainText(value);
    }
    for (const label of ['Added to Fleet', 'Last restarted', 'Memory', 'Disk space available']) {
      await expect(hostDetailsPage.vital(label), label).toBeVisible();
    }
  });
});
