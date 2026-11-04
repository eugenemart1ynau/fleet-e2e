import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open the Policies tab on a simulated Linux host.
 * Checks: the URL changes, a count is visible, and the tab mounts without an error toast.
 * Why: the Policies tab is in scope on host details. Free preview often has nothing checked.
 */
test.describe('Host details – Policies tab', () => {
  /**
   * Action: open the Linux host and click Policies.
   * Checks: the URL is /hosts/{id}/policies, a policies count is visible, the empty state says "No policies checked" or "Manage policies", and no error toast is showing. The tab name alone is not the empty state.
   * Why: the Policies tab must mount even when preview has no policies.
   */
  test('Policies tab renders without crash', { tag: '@smoke' }, async ({ hostDetailsPage, linuxHost, page }) => {
    await hostDetailsPage.goto(linuxHost.id);
    await hostDetailsPage.openTab('Policies');
    await expect(page).toHaveURL(/\/hosts\/\d+\/policies/);
    await expect(hostDetailsPage.policiesCount()).toBeVisible();
    await expect(hostDetailsPage.policiesEmptyCopy()).toBeVisible();
    await hostDetailsPage.expectNoErrorToast();
  });
});
