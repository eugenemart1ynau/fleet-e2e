import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open the Add hosts modal from /hosts/manage.
 * Checks: the modal lists the install platforms and the agent command, and it can be closed.
 * Why: Add hosts is how an operator enrolls a new machine. This test does not submit a secret.
 */
test.describe('Hosts page – Add hosts', () => {
  /**
   * Action: open /hosts/manage and open Add hosts.
   * Checks: macOS, Windows, Linux, and ChromeOS are visible, the agent-command copy is visible, and Close is visible.
   * Why: the modal is the enroll instructions an operator copies.
   */
  test('modal shows platforms and install instructions', { tag: '@smoke' }, async ({ hostsPage }) => {
    await hostsPage.goto();
    const modal = await hostsPage.openAddHosts();
    for (const platform of ['macOS', 'Windows', 'Linux', 'ChromeOS']) {
      await expect(modal.getByText(platform, { exact: true }).first()).toBeVisible();
    }
    await expect(modal.getByText(/Use this command to generate Fleet's agent/i)).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Close' })).toBeVisible();
  });
});
