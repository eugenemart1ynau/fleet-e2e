import { test, expect } from '../../../../src/fixtures';
import { expectIncluded } from '../../../../src/api/assertions';
import type { EnrollSecretSpec } from '../../../../src/api/types';
import { NO_MATCH_HOST_QUERY } from '../../../../src/utils/apiData';

/**
 * Action: close Add hosts, switch platform tabs, and read the enroll secret in the modal.
 * Checks: Close and Escape stay on /hosts/manage. The empty-state Add hosts opens the same modal. Each platform changes the instructions. The secret text matches GET /spec/enroll_secret. A Settings link is not followed.
 * Why: Add hosts is the enroll instructions. This test does not write a secret.
 */
test.describe('Hosts page – Add hosts', () => {
  /**
   * Action: open Add hosts, click each platform, then click Close.
   * Checks: the modal text changes for Windows, Linux, and ChromeOS. Close hides the modal and the URL stays /hosts/manage. The secret from GET /spec/enroll_secret is in the modal text. Any Settings link is left unclicked.
   * Why: the platform tabs are how an operator gets the right install command, and Close must not navigate away.
   */
  test('Close, platform tabs, and the enroll secret stay on /hosts/manage', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    const modal = await hostsPage.openAddHosts();

    const spec = (await (await api.get('/spec/enroll_secret')).json()) as EnrollSecretSpec;
    const secrets = spec.spec.secrets.map((s) => s.secret).filter((s) => s.length > 5);
    expect(secrets.length).toBeGreaterThan(0);
    const shown = await modal.evaluate((el) => {
      const root = el as HTMLElement;
      const fields = Array.from(root.querySelectorAll('input, textarea')).map((n) => (n as HTMLInputElement).value);
      return `${root.innerText}\n${fields.join('\n')}`;
    });
    const token = shown.match(/enroll-secret(?:=|\s+)(\S+)/)?.[1];
    expectIncluded(token, secrets, 'install command shows a secret from GET /spec/enroll_secret');

    for (const platform of ['Windows', 'Linux', 'ChromeOS']) {
      const before = await modal.innerText();
      await modal.getByText(platform, { exact: true }).first().click();
      await expect.poll(async () => modal.innerText()).not.toBe(before);
    }

    const settings = modal.getByRole('link', { name: /settings|manage enroll/i });
    if (await settings.count()) await expect(settings.first()).toBeVisible();

    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/hosts\/manage\/?(\?|$)/);
  });

  /**
   * Action: open Add hosts from the toolbar and press Escape.
   * Checks: the modal closes and the URL stays /hosts/manage.
   * Why: Escape is the other way out of the enroll instructions.
   */
  test('Escape closes Add hosts on /hosts/manage', { tag: '@regression' }, async ({ hostsPage, page }) => {
    await hostsPage.goto();
    const modal = await hostsPage.openAddHosts();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/hosts\/manage\/?(\?|$)/);
  });

  /**
   * Action: search for the shared no-match query and open Add hosts from the empty state.
   * Checks: the Add hosts modal opens, Escape closes it, and the URL stays on the no-match search.
   * Why: a miss replaces the toolbar, so that button is the other way into the same modal.
   */
  test('empty-state Add hosts opens the modal', { tag: '@regression' }, async ({ hostsPage, page }) => {
    await hostsPage.goto();
    await hostsPage.searchFor(NO_MATCH_HOST_QUERY);
    await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    await hostsPage.emptyState.getByRole('button', { name: 'Add hosts' }).click();
    const modal = hostsPage.addHostsModal();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`query=${encodeURIComponent(NO_MATCH_HOST_QUERY)}`));
  });
});
