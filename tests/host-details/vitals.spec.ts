import { test, expect } from '../../src/fixtures';

test.describe('Host details – vitals', () => {
  test('Vitals show OS and hardware matching API', async ({ hostDetailsPage, api, linuxHost, page }) => {
    const host = await api.getHost(linuxHost.id);
    await hostDetailsPage.goto(host.id);
    await expect(page.getByText('Vitals', { exact: true })).toBeVisible();
    await expect(page.getByText(host.os_version).first()).toBeVisible();
    if (host.primary_ip) await expect(page.getByText(host.primary_ip).first()).toBeVisible();
  });
});
