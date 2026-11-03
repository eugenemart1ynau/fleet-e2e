import { test, expect } from '../../src/fixtures';

test.describe('Hosts page – search', () => {
  test('search by hostname narrows list and syncs ?query=', async ({ hostsPage, api, linuxHost }) => {
    await hostsPage.goto();
    await hostsPage.searchFor(linuxHost.display_name);

    const expected = await api.listHosts({ query: linuxHost.display_name });
    await hostsPage.expectCount(expected.length);
    await expect(hostsPage.hostLink(linuxHost.display_name)).toBeVisible();
  });

  test('no-match search shows empty state', async ({ hostsPage }) => {
    await hostsPage.goto();
    await hostsPage.searchFor('zz-no-such-host-e2e');
    await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    await expect(hostsPage.search).toBeEnabled();
  });

  test('deep link ?query= pre-fills search and filters', async ({ hostsPage, linuxHost }) => {
    await hostsPage.goto({ query: linuxHost.display_name });
    await expect(hostsPage.search).toHaveValue(linuxHost.display_name);
    await expect(hostsPage.hostLink(linuxHost.display_name)).toBeVisible();
  });
});
