import { test, expect } from '../../../../src/fixtures';

/**
 * Action: choose New, Offline, and Missing in the Hosts status filter.
 * Checks: the URL gains ?status=, and the table count or empty state matches GET /hosts/count for that status.
 * Why: those filters are how an operator triages hosts that are not simply online.
 */
test.describe('Hosts page – status filter', () => {
  /**
   * Action: open /hosts/manage and choose New hosts.
   * Checks: the URL contains status=new. A zero count shows "No hosts match your filters". A non-zero count matches GET /hosts/count?status=new.
   * Why: New is a time-based filter and is often empty on a settled preview.
   */
  test('New filter matches API and syncs ?status=new', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('New hosts');
    await expect(page).toHaveURL(/status=new/);

    const count = await api.countHosts({ status: 'new' });
    if (count === 0) {
      await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    } else {
      await hostsPage.expectCount(count);
    }
  });

  /**
   * Action: open /hosts/manage and choose Offline hosts.
   * Checks: the URL contains status=offline. A zero count shows "No hosts match your filters". A non-zero count matches GET /hosts/count?status=offline.
   * Why: Offline is the other half of the online/offline split and is often empty on preview.
   */
  test('Offline filter matches API (empty state when none offline)', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Offline hosts');
    await expect(page).toHaveURL(/status=offline/);

    const count = await api.countHosts({ status: 'offline' });
    if (count === 0) {
      await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    } else {
      await hostsPage.expectCount(count);
    }
  });

  /**
   * Action: open /hosts/manage and choose Missing hosts.
   * Checks: the URL contains status=missing. A zero count shows "No hosts match your filters". A non-zero count matches GET /hosts/count?status=missing.
   * Why: Missing is a time-based overlay and is often empty on preview.
   */
  test('Missing filter matches API (empty state when none missing)', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Missing hosts');
    await expect(page).toHaveURL(/status=missing/);

    const count = await api.countHosts({ status: 'missing' });
    if (count === 0) {
      await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    } else {
      await hostsPage.expectCount(count);
    }
  });

  /**
   * Action: choose Online hosts, then choose All hosts.
   * Checks: status leaves the URL and the count matches GET /hosts/count with no status.
   * Why: All hosts is how an operator clears a status filter.
   */
  test('All hosts clears the status param', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Online hosts');
    await hostsPage.filterByStatus('All hosts');
    await expect(page).not.toHaveURL(/status=/);
    await hostsPage.expectCount(await api.countHosts());
  });

  /**
   * Action: choose Enrolled hosts.
   * Checks: the URL contains status=enrolled. A zero count shows the empty state. A non-zero count matches GET /hosts/count?status=enrolled.
   * Why: Enrolled is a free-tier status and excludes hosts that are only pending.
   */
  test('Enrolled filter matches API and syncs ?status=enrolled', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Enrolled hosts');
    await expect(page).toHaveURL(/status=enrolled/);

    const count = await api.countHosts({ status: 'enrolled' });
    if (count === 0) {
      await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    } else {
      await hostsPage.expectCount(count);
    }
  });

  /**
   * Action: open /hosts/manage?status=not-a-status directly.
   * Checks: the Hosts heading is still visible.
   * Why: a bad shared status link must not take down the page.
   */
  test('bad ?status= does not crash the page', { tag: '@regression' }, async ({ hostsPage, page }) => {
    await page.goto('/hosts/manage?status=not-a-status');
    await expect(hostsPage.heading).toBeVisible();
  });
});
