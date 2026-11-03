import { test, expect } from '../../src/fixtures';

test.describe('Host details – header & summary', () => {
  test('@smoke header shows display name and status matching API', async ({ hostDetailsPage, api, linuxHost, page }) => {
    const host = await api.getHost(linuxHost.id);
    await hostDetailsPage.goto(host.id);

    await expect(hostDetailsPage.displayName).toHaveText(host.display_name);
    await expect(page).toHaveTitle(new RegExp(`${host.display_name} \\| Hosts`));
    await expect(page.getByText(new RegExp(`^${host.status}$`, 'i')).first()).toBeVisible();
    await expect(hostDetailsPage.refetchButton).toBeVisible();
  });

  test('tabs render for a Linux host', async ({ hostDetailsPage, linuxHost }) => {
    await hostDetailsPage.goto(linuxHost.id);
    for (const t of ['Details', 'Software', 'Reports', 'Policies'] as const) {
      await expect(hostDetailsPage.tab(t)).toBeVisible();
    }
  });

  test.fixme('Back to all hosts restores previous filters', async () => {});
  test.fixme('Refetch transitions to "Fetching fresh vitals" and back', async () => {});
});
