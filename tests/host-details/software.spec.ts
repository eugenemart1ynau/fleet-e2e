import { test, expect } from '../../src/fixtures';

test.describe('Host details – software inventory', () => {
  test('inventory count matches API and search filters', async ({ hostDetailsPage, api, linuxHost, page }) => {
    const sw = await api.getHostSoftware(linuxHost.id);
    test.skip(sw.count === 0, 'host has not reported software yet');

    await hostDetailsPage.goto(linuxHost.id, 'software');
    await expect(page.getByText(new RegExp(`^${sw.count} items?$`))).toBeVisible();

    const target = sw.software[0].name;
    await hostDetailsPage.softwareSearch.fill(target);
    await expect(page).toHaveURL(new RegExp(`query=${encodeURIComponent(target)}`));
    await expect(page.getByRole('cell', { name: target }).first()).toBeVisible();
  });

  test('no-match software search shows empty state', async ({ hostDetailsPage, linuxHost, page }) => {
    await hostDetailsPage.goto(linuxHost.id, 'software');
    await hostDetailsPage.softwareSearch.fill('zz-no-such-software-e2e');
    await expect(page.getByText('No items match the current search criteria')).toBeVisible();
  });
});
