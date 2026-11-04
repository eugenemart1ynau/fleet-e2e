import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open the Reports tab on a simulated Linux host.
 * Checks: the URL changes, a count is visible, and the tab mounts without an error toast.
 * Why: the Reports tab is in scope on host details. Free preview often has nothing scheduled.
 */
test.describe('Host details – Reports tab', () => {
  /**
   * Action: open the Linux host and click Reports.
   * Checks: the URL matches /queries or /reports, a reports count is visible, the empty state says "No reports scheduled" or "Schedule a report", and no error toast is showing. The tab name alone is not the empty state.
   * Why: the Reports tab must mount even when preview has nothing scheduled.
   */
  test('Reports tab renders without crash', { tag: '@regression' }, async ({ hostDetailsPage, linuxHost, page }) => {
    await hostDetailsPage.goto(linuxHost.id);
    await hostDetailsPage.openTab('Reports');
    await expect(page).toHaveURL(/\/hosts\/\d+\/queries|\/hosts\/\d+\/reports/);
    await expect(hostDetailsPage.reportsCount()).toBeVisible();
    await expect(hostDetailsPage.reportsEmptyCopy()).toBeVisible();
    await hostDetailsPage.expectNoErrorToast();
  });
});
