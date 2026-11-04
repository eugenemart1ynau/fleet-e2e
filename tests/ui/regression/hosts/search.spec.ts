import { test, expect } from '../../../../src/fixtures';
import { NO_MATCH_HOST_QUERY } from '../../../../src/utils/apiData';

/**
 * Action: search the Hosts page for a miss, open a ?query= deep link, and combine search with a platform label.
 * Checks: a miss shows the empty state, a deep link pre-fills the box, and Linux plus a query matches GET /labels/:id/hosts.
 * Why: search has to recover from a miss, honor a shared link, and work with the platform menu.
 */
test.describe('Hosts page – search', () => {
  /**
   * Action: open /hosts/manage and search for the shared no-match query.
   * Checks: the empty state says "No hosts match your filters", and the search box stays enabled.
   * Why: a miss must show the empty state instead of a stale table.
   */
  test('no-match search shows empty state', { tag: '@regression' }, async ({ hostsPage }) => {
    await hostsPage.goto();
    await hostsPage.searchFor(NO_MATCH_HOST_QUERY);
    await expect(hostsPage.emptyState).toContainText('No hosts match your filters');
    await expect(hostsPage.search).toBeEnabled();
  });

  /**
   * Action: open /hosts/manage?query={display name} directly.
   * Checks: the search box is pre-filled with that name, and that host's link is visible.
   * Why: a shared search link must filter the table on arrival.
   */
  test('deep link ?query= pre-fills search and filters', { tag: '@regression' }, async ({ hostsPage, linuxHost }) => {
    await hostsPage.goto({ query: linuxHost.display_name });
    await expect(hostsPage.search).toHaveValue(linuxHost.display_name);
    await expect(hostsPage.hostLink(linuxHost.display_name)).toBeVisible();
  });

  /**
   * Action: search for the simulated Linux host, then clear the box.
   * Checks: ?query= leaves the URL and the display names match the unfiltered GET /hosts list.
   * Why: clearing search is how an operator gets the full fleet back.
   */
  test(
    'clearing search drops ?query= and shows every host',
    { tag: '@regression' },
    async ({ hostsPage, api, linuxHost }) => {
      await hostsPage.goto();
      await hostsPage.searchFor(linuxHost.display_name);
      await hostsPage.searchFor('');
      const all = await api.listHosts();
      expect(await hostsPage.hostNames()).toEqual(all.map((h) => h.display_name));
    },
  );

  /**
   * Action: search with spaces only, then with % and with _.
   * Checks: spaces show the same names as GET /hosts with an empty query. % and _ show the same names as GET /hosts?query= for that character.
   * Why: the box must not treat whitespace or SQL wildcards as "match everything".
   */
  test('whitespace and SQL wildcards follow the API', { tag: '@regression' }, async ({ hostsPage, api }) => {
    await hostsPage.goto();
    await hostsPage.search.fill('   ');
    await expect.poll(async () => hostsPage.hostNames()).toEqual((await api.listHosts()).map((h) => h.display_name));

    for (const query of ['%', '_']) {
      await hostsPage.searchFor(query);
      const expected = await api.listHosts({ query });
      expect(await hostsPage.hostNames(), query).toEqual(expected.map((h) => h.display_name));
    }
  });

  /**
   * Action: search by a prefix, UUID, IP, and a different case of the Linux host. Search by serial and computer name only when an enrolled host reports them.
   * Checks: each query's display names match GET /hosts?query=, and the host that owns that value is in the list. Serial and computer name are noted and left out when preview has no such host.
   * Why: the placeholder says the box searches those fields, not only the visible hostname. Simulated Linux hosts leave serial blank and copy the hostname into computer_name.
   */
  test(
    'prefix, uuid, ip, serial, computer name, and case match the API',
    { tag: '@regression' },
    async ({ hostsPage, api, linuxHost }) => {
      const fleet = await api.listAllHosts();
      // Simulated Linux has no serial, and its computer name is the hostname.
      const serialHost = fleet.find((h) => h.hardware_serial.trim() !== '');
      const namedHost = fleet.find((h) => h.computer_name.trim() !== '' && h.computer_name !== h.hostname);
      expect(linuxHost.hostname.length, 'linux hostname').toBeGreaterThanOrEqual(3);
      expect(linuxHost.primary_ip, 'linux primary_ip').toBeTruthy();

      const cases: Array<{ name: string; query: string; id: number }> = [
        { name: 'prefix', query: linuxHost.hostname.slice(0, 3), id: linuxHost.id },
        { name: 'uuid', query: linuxHost.uuid, id: linuxHost.id },
        { name: 'ip', query: linuxHost.primary_ip, id: linuxHost.id },
      ];
      if (serialHost) cases.push({ name: 'serial', query: serialHost.hardware_serial, id: serialHost.id });
      else
        test.info().annotations.push({ type: 'skipped-case', description: 'no enrolled host reports hardware_serial' });
      if (namedHost) {
        cases.push({ name: 'computer name', query: namedHost.computer_name, id: namedHost.id });
      } else {
        test.info().annotations.push({
          type: 'skipped-case',
          description: 'no enrolled host reports a computer_name different from its hostname',
        });
      }
      const upper = linuxHost.display_name.toUpperCase();
      if (upper !== linuxHost.display_name) cases.push({ name: 'case', query: upper, id: linuxHost.id });

      for (const c of cases) {
        await hostsPage.goto();
        await hostsPage.searchFor(c.query);
        const expected = await api.listHosts({ query: c.query });
        expect(await hostsPage.hostNames(), c.name).toEqual(expected.map((h) => h.display_name));
        expect(
          expected.some((h) => h.id === c.id),
          c.name,
        ).toBeTruthy();
      }
    },
  );

  /**
   * Action: choose Online hosts, then search for the simulated Linux host.
   * Checks: the count matches GET /hosts/count with both status=online and that query.
   * Why: operators combine the status filter with search.
   */
  test('search plus Online matches the API count', { tag: '@regression' }, async ({ hostsPage, api, linuxHost }) => {
    await hostsPage.goto();
    await hostsPage.filterByStatus('Online hosts');
    await hostsPage.searchFor(linuxHost.display_name);
    const count = await api.countHosts({ status: 'online', query: linuxHost.display_name });
    await hostsPage.expectCount(count);
  });

  /**
   * Action: choose Linux, then search for the simulated Linux host.
   * Checks: the display names match GET /labels/:id/hosts?query= for that name, and that host is in the list.
   * Why: operators search inside a platform filter, not only across the whole fleet.
   */
  test(
    'search plus Linux matches the label hosts API',
    { tag: '@regression' },
    async ({ hostsPage, api, linuxHost }) => {
      await hostsPage.goto();
      await hostsPage.filterByPlatformOrLabel('Linux');
      const labelId = hostsPage.labelIdFromUrl();
      expect(labelId).toBeTruthy();
      await hostsPage.searchFor(linuxHost.display_name);
      const hosts = await api.listLabelHosts(labelId!, { query: linuxHost.display_name });
      expect(await hostsPage.hostNames()).toEqual(hosts.map((h) => h.display_name));
      expect(hosts.some((h) => h.id === linuxHost.id)).toBeTruthy();
    },
  );
});
