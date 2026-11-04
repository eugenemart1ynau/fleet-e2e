import { test, expect } from '../../../../src/fixtures';
import type { HostStatus } from '../../../../src/api/types';

/** Fleet prints the API status with a capital first letter. mia is shown as Missing. */
function statusLabel(status: HostStatus): string {
  if (status === 'mia') return 'Missing';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Action: open /hosts/manage and read the operating system, status, and disk space cells.
 * Checks: each visible row matches GET /hosts for those three fields.
 * Why: the name is already checked. These are the other facts an operator reads on the row.
 */
test.describe('Hosts page – row cells', () => {
  /**
   * Action: open /hosts/manage.
   * Checks: os_version, status, and available disk space on each row match that host from GET /hosts.
   * Why: a row can show the right name and the wrong operating system.
   */
  test(
    'operating system, status, and disk space match GET /hosts',
    { tag: '@regression' },
    async ({ hostsPage, api }) => {
      const hosts = await api.listHosts();
      await hostsPage.goto();
      await hostsPage.expectCount(hosts.length);

      for (const host of hosts) {
        const row = hostsPage.row(host.display_name);
        // The cell repeats the value for its tooltip, so the visible text is not the API string alone.
        await expect(row.locator('td.os_version__cell'), host.display_name).toContainText(host.os_version || '---');
        await expect(row.locator('td.status__cell'), host.display_name).toContainText(statusLabel(host.status));
        await expect(row.locator('td.gigs_disk_space_available__cell'), host.display_name).toContainText(
          `${host.gigs_disk_space_available.toFixed(2)} GB`,
        );
      }
    },
  );
});
