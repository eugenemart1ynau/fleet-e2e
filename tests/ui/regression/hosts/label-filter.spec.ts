import { test, expect } from '../../../../src/fixtures';
import { absentId, NO_MATCH_HOST_QUERY } from '../../../../src/utils/apiData';

/**
 * Action: filter Hosts by the other platform and builtin labels, narrow that menu by name, and open an unknown label id.
 * Checks: each menu row matches GET /labels/:id/hosts. Filter by label name leaves only the Debian label and stays on Hosts. Add label is not clicked. Choosing Linux again leaves /labels/:id. An unknown label does not list the unfiltered fleet.
 * Why: the platform menu is more than the Linux happy path.
 */
test.describe('Hosts page – platform / label filter', () => {
  /**
   * Action: choose macOS, Windows, and ChromeOS from the platform menu.
   * Checks: each option is in the menu, the URL is /hosts/manage/labels/{id}, and the display names match GET /labels/:id/hosts.
   * Why: those builtins are the rest of the platform menu on a free preview.
   */
  test('other platform labels match the label hosts API', { tag: '@regression' }, async ({ hostsPage, api }) => {
    for (const name of ['macOS', 'Windows', 'ChromeOS']) {
      await hostsPage.goto();
      await hostsPage.filterByPlatformOrLabel(name);
      const labelId = hostsPage.labelIdFromUrl();
      expect(labelId, name).toBeTruthy();
      const hosts = await api.listLabelHosts(labelId!);
      expect(await hostsPage.hostNames(), name).toEqual(hosts.map((h) => h.display_name));
    }
  });

  /**
   * Action: choose iOS, iPadOS, Android, and each builtin label in the Labels section.
   * Checks: the URL is /hosts/manage/labels/{id} and the display names match GET /labels/:id/hosts, including an empty list.
   * Why: those rows are the rest of the same menu. An empty platform must not keep the unfiltered fleet.
   */
  test(
    'mobile platforms and builtin labels match the label hosts API',
    { tag: '@regression' },
    async ({ hostsPage, api }) => {
      const names = [
        'iOS',
        'iPadOS',
        'Android',
        'Apple Silicon macOS hosts',
        'ARM-based Windows hosts',
        'Debian-based Linux hosts',
        'x86-based Windows hosts',
      ];
      for (const name of names) {
        await hostsPage.goto();
        await hostsPage.filterByPlatformOrLabel(name);
        const labelId = hostsPage.labelIdFromUrl();
        expect(labelId, name).toBeTruthy();
        const hosts = await api.listLabelHosts(labelId!);
        expect(await hostsPage.hostNames(), name).toEqual(hosts.map((h) => h.display_name));
      }
    },
  );

  /**
   * Action: open the platform menu and type Debian into Filter by label name.
   * Checks: Debian-based Linux hosts stays visible. Apple Silicon, ARM-based Windows, and x86-based Windows hosts do not. The URL stays /hosts/manage. Add label is visible and is not clicked.
   * Why: that box narrows the Labels section. Add label opens the label editor.
   */
  test(
    'filter by label name narrows the menu and stays on Hosts',
    { tag: '@regression' },
    async ({ hostsPage, page }) => {
      await hostsPage.goto();
      const menu = await hostsPage.openLabelMenu();
      const nameFilter = hostsPage.labelNameFilter();
      // fill() blurs this react-select input and closes the menu.
      await nameFilter.click();
      await nameFilter.pressSequentially('Debian');
      await expect(menu.getByText('Debian-based Linux hosts', { exact: true })).toBeVisible();
      await expect(menu.getByText('Apple Silicon macOS hosts', { exact: true })).toHaveCount(0);
      await expect(menu.getByText('ARM-based Windows hosts', { exact: true })).toHaveCount(0);
      await expect(menu.getByText('x86-based Windows hosts', { exact: true })).toHaveCount(0);
      await expect(menu.getByRole('button', { name: 'Add label' })).toBeVisible();
      await expect(page).toHaveURL(/\/hosts\/manage\/?(\?|$)/);
    },
  );

  /**
   * Action: choose Linux, open the platform menu, and choose Linux again.
   * Checks: the URL leaves /hosts/manage/labels/:id. The menu has no All hosts row.
   * Why: the platform menu clears by selecting the current platform again. All hosts is the status dropdown.
   */
  test('choosing Linux again leaves the label URL', { tag: '@regression' }, async ({ hostsPage }) => {
    await hostsPage.goto();
    await hostsPage.filterByPlatformOrLabel('Linux');
    expect(hostsPage.labelIdFromUrl()).toBeTruthy();
    const menu = await hostsPage.openLabelMenu();
    await expect(menu.getByText('All hosts', { exact: true })).toHaveCount(0);
    await hostsPage.labelOption('Linux').click();
    await hostsPage.waitForLoaded();
    expect(hostsPage.labelIdFromUrl()).toBeNull();
  });

  /**
   * Action: choose Linux, then Online hosts.
   * Checks: the display names match GET /labels/:id/hosts?status=online.
   * Why: platform and status are used together.
   */
  test('Linux plus Online matches the label hosts API', { tag: '@regression' }, async ({ hostsPage, api }) => {
    await hostsPage.goto();
    await hostsPage.filterByPlatformOrLabel('Linux');
    await hostsPage.filterByStatus('Online hosts');
    const labelId = hostsPage.labelIdFromUrl();
    expect(labelId).toBeTruthy();
    const hosts = await api.listLabelHosts(labelId!, { status: 'online' });
    expect(await hostsPage.hostNames()).toEqual(hosts.map((h) => h.display_name));
  });

  /**
   * Action: choose Linux and search for the shared no-match query.
   * Checks: the empty state says "No hosts match your filters".
   * Why: a platform filter plus a miss must not keep showing the Linux hosts.
   */
  test('Linux plus a miss shows the empty state', { tag: '@regression' }, async ({ hostsPage }) => {
    await hostsPage.goto();
    await hostsPage.filterByPlatformOrLabel('Linux');
    await hostsPage.searchFor(NO_MATCH_HOST_QUERY);
    await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
  });

  /**
   * Action: open /hosts/manage/labels/{id} for an id that is not a label.
   * Checks: Fleet's 404 page shows no host links, or the Hosts page shows the empty state and no host links. The unfiltered fleet is not listed.
   * Why: a bad label link must not crash the hosts page or show every host.
   */
  test('unknown label id does not crash', { tag: '@regression' }, async ({ hostsPage, api }) => {
    const labels = await api.get('/labels');
    const body = (await labels.json()) as { labels: Array<{ id: number }> };
    const id = absentId(body.labels.map((l) => l.id));
    await hostsPage.expectUnknownLabel(id);
  });

  /**
   * Action: choose Linux and look for an edit-label control.
   * Checks: the URL is still /hosts/manage/labels/:id. The label editor heading is not shown. The control is not clicked.
   * Why: that control opens the label editor, which is the next page.
   */
  test('edit label is not opened', { tag: '@regression' }, async ({ hostsPage, page }) => {
    await hostsPage.goto();
    await hostsPage.filterByPlatformOrLabel('Linux');
    await expect(page).toHaveURL(/\/hosts\/manage\/labels\/\d+/);
    await expect(page.getByRole('heading', { name: /edit label/i })).toHaveCount(0);
    const edit = hostsPage.editLabelControl();
    // Visible is enough. Clicking it opens the label editor.
    if (await edit.count()) await expect(edit.first()).toBeVisible();
  });
});
