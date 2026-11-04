import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open the Details tab side cards for a simulated Linux host.
 * Checks: Activity, User, and Labels render, and one real label name from GET /hosts/:id is on screen.
 * Why: those cards are the summary next to the host vitals.
 */
test.describe('Host details – Activity / Labels / User cards', () => {
  /**
   * Action: open /hosts/{id}/details for the simulated Linux host.
   * Checks: the Activity heading is visible with "No activity", "Past", or "Upcoming". The User heading and "Username (IdP)" are visible. The Labels heading is visible, and one label other than "All Hosts" or "All Linux" from GET /hosts/:id is on screen.
   * Why: a missing card means the details summary did not render.
   */
  test(
    'Activity, Labels, and User sections render on Details',
    { tag: '@smoke' },
    async ({ hostDetailsPage, api, linuxHost }) => {
      const host = await api.getHost(linuxHost.id);
      await hostDetailsPage.goto(host.id);

      await expect(hostDetailsPage.activityHeading).toBeVisible();
      await expect(hostDetailsPage.activityCopy()).toBeVisible();

      await expect(hostDetailsPage.userHeading).toBeVisible();
      await expect(hostDetailsPage.userIdpLabel()).toBeVisible();

      await expect(hostDetailsPage.labelsHeading).toBeVisible();
      const shown = host.labels.filter((l) => l.name !== 'All Hosts' && l.name !== 'All Linux').map((l) => l.name);
      expect(shown.length, 'host has a label chip besides All Hosts and All Linux').toBeGreaterThan(0);
      await hostDetailsPage.expectOneLabelVisible(shown);
    },
  );
});
