import { test, expect } from '../../src/fixtures';

test.describe('Hosts page – status filter', () => {
  test('Online filter matches API and syncs ?status=online', async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Online hosts');
    await expect(page).toHaveURL(/status=online/);

    const online = await api.countHosts({ status: 'online' });
    await hostsPage.expectCount(online);
  });

  test.fixme('Offline filter shows empty state when all hosts online', async () => {
    // TODO: assert empty state vs API count for status=offline
  });
});
