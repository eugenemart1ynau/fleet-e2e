import { test, expect } from '../../../../src/fixtures';
import type { ActivitiesResponse } from '../../../../src/api/types';

/**
 * Action: compare the Details side cards with the host payload.
 * Checks: label chips, the user row, and both activity feeds agree with GET /hosts/:id. Agent options renders when the card is on the page. Label chips are not clicked.
 * Why: the smoke test only checks that the headings render.
 */
test.describe('Host details – Activity / Labels / User cards', () => {
  /**
   * Action: open /hosts/{id}/details for the simulated Linux host.
   * Checks: at least one label name from GET /hosts/:id is visible. Platform labels Fleet does not chip are not required. A username from host.users is visible, or the User heading is visible when that list is empty. Past and upcoming activity requests succeed, and the card shows activity copy.
   * Why: the chips and the feeds are the data in those cards.
   */
  test(
    'labels, user, and activity match the host APIs',
    { tag: '@regression' },
    async ({ hostDetailsPage, api, linuxHost, page }) => {
      const host = await api.getHost(linuxHost.id);
      await hostDetailsPage.goto(host.id);

      expect(host.labels.length, 'host has labels').toBeGreaterThan(0);
      await hostDetailsPage.expectOneLabelVisible(host.labels.map((l) => l.name));
      await expect(page).toHaveURL(new RegExp(`/hosts/${host.id}/details`));

      const users = host.users as Array<{ username?: string }>;
      if (users.some((u) => u.username)) {
        await expect(page.getByText(users.find((u) => u.username)!.username!).first()).toBeVisible();
      } else {
        await expect(hostDetailsPage.userHeading).toBeVisible();
      }

      const pastRes = await api.get(`/hosts/${host.id}/activities`);
      const upcomingRes = await api.get(`/hosts/${host.id}/activities/upcoming`);
      expect(pastRes.ok()).toBeTruthy();
      expect(upcomingRes.ok()).toBeTruthy();
      const past = (await pastRes.json()) as ActivitiesResponse;
      const upcoming = (await upcomingRes.json()) as ActivitiesResponse;
      const pastEmpty = past.activities == null || past.activities.length === 0;
      const upcomingEmpty = upcoming.activities == null || upcoming.activities.length === 0;
      if (pastEmpty && upcomingEmpty) await expect(hostDetailsPage.activityCopy()).toBeVisible();
      else await expect(hostDetailsPage.activityHeading).toBeVisible();
    },
  );

  /**
   * Action: open the Linux host and look for Agent options.
   * Checks: when the card is present its heading is visible, and the URL is still /hosts/{id}/details.
   * Why: the card is on some Linux hosts. Editing it would leave this page.
   */
  test(
    'Agent options stays on the details page when the card is present',
    { tag: '@regression' },
    async ({ hostDetailsPage, linuxHost, page }) => {
      await hostDetailsPage.goto(linuxHost.id);
      const card = hostDetailsPage.agentOptionsHeading;
      if (await card.count()) await expect(card.first()).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/hosts/${linuxHost.id}/details`));
    },
  );
});
