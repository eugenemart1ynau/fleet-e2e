import { test, expect } from '../../../../src/fixtures';

/**
 * Action: open a simulated Linux host and use the tabs and Refetch.
 * Checks: the four tabs render, and Refetch changes the button label.
 * Why: those controls are how an operator moves around a host after the header has loaded. The Online filter trip back to the list is in ui/e2e/hosts-and-details.
 */
test.describe('Host details – header & summary', () => {
  /**
   * Action: open /hosts/{id}/details and click Details, Software, Reports, and Policies.
   * Checks: each click sets that tab's URL and aria-selected=true.
   * Why: the tab is how an operator moves around the host.
   */
  test('tabs render for a Linux host', { tag: '@regression' }, async ({ hostDetailsPage, linuxHost, page }) => {
    await hostDetailsPage.goto(linuxHost.id);
    const paths = {
      Details: /\/details$/,
      Software: /\/software\/inventory$/,
      Reports: /\/(reports|queries)$/,
      Policies: /\/policies$/,
    } as const;
    for (const t of ['Details', 'Software', 'Reports', 'Policies'] as const) {
      await hostDetailsPage.openTab(t);
      await expect(page).toHaveURL(paths[t]);
      await expect(hostDetailsPage.tab(t)).toHaveAttribute('aria-selected', 'true');
    }
  });

  /**
   * Action: open each host tab from its URL.
   * Checks: the tab's href loads with that tab selected.
   * Why: a shared tab link must arrive on that tab.
   */
  test('each tab URL selects that tab', { tag: '@regression' }, async ({ hostDetailsPage, linuxHost, page }) => {
    await hostDetailsPage.goto(linuxHost.id);
    for (const t of ['Details', 'Software', 'Reports', 'Policies'] as const) {
      await hostDetailsPage.openTab(t);
      const url = page.url();
      await page.goto(url);
      await hostDetailsPage.waitForLoaded();
      await expect(hostDetailsPage.tab(t)).toHaveAttribute('aria-selected', 'true');
    }
  });

  /**
   * Action: open /hosts/{id}/not-a-tab.
   * Checks: Fleet's 404 page or the host header is visible.
   * Why: a bad tab link must not crash the browser.
   */
  test('bad tab path does not crash', { tag: '@regression' }, async ({ hostDetailsPage, linuxHost }) => {
    await hostDetailsPage.pageGoto(`/hosts/${linuxHost.id}/not-a-tab`);
    const notFound = hostDetailsPage.notFoundCopy();
    await expect(notFound.or(hostDetailsPage.displayName)).toBeVisible();
    if (await notFound.isVisible()) await expect(hostDetailsPage.displayName).toHaveCount(0);
    else await expect(hostDetailsPage.displayName).toBeVisible();
  });

  /**
   * Action: open the Linux host from its URL and click Back to all hosts.
   * Checks: the URL is /hosts/manage and does not include status=.
   * Why: Back with no filter must return to the unfiltered list. The Online filter trip is in ui/e2e/hosts-and-details.
   */
  test(
    'Back with no filter returns to /hosts/manage',
    { tag: '@regression' },
    async ({ hostDetailsPage, linuxHost, page }) => {
      await hostDetailsPage.goto(linuxHost.id);
      await hostDetailsPage.backToAllHosts();
      await expect(page).toHaveURL(/\/hosts\/manage\/?(\?|$)/);
      await expect(page).not.toHaveURL(/status=/);
    },
  );

  /**
   * Action: search the Hosts page, open the Linux host, and click Back to all hosts.
   * Checks: the URL still contains query= for that display name.
   * Why: Back must keep the search the operator had on.
   */
  test(
    'Back keeps the search query',
    { tag: '@regression' },
    async ({ hostsPage, hostDetailsPage, linuxHost, page }) => {
      await hostsPage.goto();
      await hostsPage.searchFor(linuxHost.display_name);
      await hostsPage.openHost(linuxHost.display_name);
      await hostDetailsPage.backToAllHosts();
      await expect(page).toHaveURL(new RegExp(`query=${encodeURIComponent(linuxHost.display_name)}`));
    },
  );

  /**
   * Action: open the Linux host and click Refetch.
   * Checks: the button starts as "Refetch", then contains "Fetching fresh vitals", and is disabled while that label is up.
   * Why: Refetch is the control that asks the agent to report again, and a second click must wait.
   */
  test(
    'Refetch transitions to "Fetching fresh vitals"',
    { tag: '@regression' },
    async ({ hostDetailsPage, linuxHost }) => {
      await hostDetailsPage.goto(linuxHost.id);
      await expect(hostDetailsPage.refetchButton).toHaveText(/^Refetch$/);
      await hostDetailsPage.clickRefetch();
      await expect(hostDetailsPage.refetchButton).toContainText(/Fetching fresh vitals/i);
      await expect(hostDetailsPage.refetchButton).toBeDisabled();
    },
  );

  /**
   * Action: open Actions, then open Delete and press Escape.
   * Checks: Delete is in the menu. Escape closes the modal and GET /hosts/:id is still 200. No other menu item is clicked.
   * Why: Delete is the only Actions item this suite activates, and Escape must not delete the host.
   */
  test(
    'Actions lists Delete, and Escape closes it',
    { tag: '@regression' },
    async ({ hostDetailsPage, api, linuxHost, page }) => {
      await hostDetailsPage.goto(linuxHost.id);
      await hostDetailsPage.actionsDropdown.click();
      const del = hostDetailsPage.actionOption('Delete');
      await expect(del).toBeVisible();
      await del.click();
      await hostDetailsPage.deleteModal.expectOpen();
      await page.keyboard.press('Escape');
      await hostDetailsPage.deleteModal.expectClosed();
      expect(await api.getHostStatusCode(linuxHost.id)).toBe(200);
    },
  );
});
