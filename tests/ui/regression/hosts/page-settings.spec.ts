import { test, expect } from '../../../../src/fixtures';
import { expectIncluded } from '../../../../src/api/assertions';
import type { EnrollSecretSpec } from '../../../../src/api/types';

/**
 * Action: open Hosts page settings and close Enroll secrets.
 * Checks: Enroll secrets opens Manage enroll secrets, the secret value matches GET /spec/enroll_secret, and Done closes it on /hosts/manage. Activity automations is disabled. Custom host vitals is not clicked. Add secret is not clicked.
 * Why: the gear is the remaining toolbar control. Two of its items leave this page or write a secret.
 */
test.describe('Hosts page – page settings', () => {
  /**
   * Action: open Hosts page settings, open Enroll secrets, and click Done.
   * Checks: Activity automations is aria-disabled. The password field value is one of the secrets from GET /spec/enroll_secret. Done hides the modal. The URL stays /hosts/manage.
   * Why: Enroll secrets stays on this page. Custom host vitals opens Controls, and Add secret would write a secret.
   */
  test('enroll secrets closes on /hosts/manage', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    const menu = await hostsPage.openPageSettings();
    await expect(menu.getByText('Enroll secrets', { exact: true })).toBeVisible();
    // Disabled on free preview. Custom host vitals and Add secret are not clicked.
    await expect(hostsPage.pageSettingsOption('Activity automations')).toHaveAttribute('aria-disabled', 'true');
    await menu.getByText('Enroll secrets', { exact: true }).click();
    const modal = hostsPage.enrollSecretsModal();
    await expect(modal).toBeVisible();
    const spec = (await (await api.get('/spec/enroll_secret')).json()) as EnrollSecretSpec;
    const secrets = spec.spec.secrets.map((s) => s.secret).filter((s) => s.length > 5);
    const shown = await modal.locator('input[type="password"]').inputValue();
    expectIncluded(shown, secrets, 'enroll secret field matches GET /spec/enroll_secret');
    await modal.getByRole('button', { name: 'Done' }).click();
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/hosts\/manage\/?(\?|$)/);
  });
});
