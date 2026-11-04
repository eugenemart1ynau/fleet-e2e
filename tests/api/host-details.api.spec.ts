import { test, expect } from '../../src/fixtures/api';
import { DEFAULT_SOFTWARE_LIST, type FleetApiClient } from '../../src/api/FleetApiClient';
import { expectFleetError, expectJson, expectNullOrArray, expectStatus } from '../../src/api/assertions';
import type { ActivitiesResponse, HostResponse, HostSoftwareResponse } from '../../src/api/types';
import { hostNotFound, missingHostId, NO_MATCH_SOFTWARE_QUERY } from '../../src/utils/apiData';

/**
 * Call: GET /hosts/:id.
 * Checks: identity, vitals, labels, policies, and Reports data for one host, plus missing-id errors.
 * Why: the host details header, vitals, Policies tab, and Reports tab read this response.
 */
test.describe('API: GET /hosts/:id @api', () => {
  /**
   * Call: GET /hosts/:id?exclude_software=true for the known host.
   * Checks: id, display_name, hostname, platform, os_version, uuid, primary_ip, and status match the list row. memory, cpu_type, hardware_model, primary_mac, osquery_version, seen_time, and refetch_requested are the right types. labels is an array containing "All Hosts". policies is an array. issues.failing_policies_count is a number. pack_stats is null or an array.
   * Why: the details page, Policies tab, and Reports tab read these fields. pack_stats is null on a fresh preview.
   */
  test('returns the host with fields matching the list entry', { tag: '@smoke' }, async ({ api, knownHost }) => {
    const { host } = await expectJson<HostResponse>(
      await api.get(`/hosts/${knownHost.id}`, { params: { exclude_software: true } }),
    );
    expect(host).toMatchObject({
      id: knownHost.id,
      display_name: knownHost.display_name,
      hostname: knownHost.hostname,
      platform: knownHost.platform,
      os_version: knownHost.os_version,
      uuid: knownHost.uuid,
      primary_ip: knownHost.primary_ip,
      status: knownHost.status,
    });
    expect(host).toMatchObject({
      memory: expect.any(Number),
      cpu_type: expect.any(String),
      hardware_model: expect.any(String),
      primary_mac: expect.any(String),
      osquery_version: expect.any(String),
      seen_time: expect.any(String),
      refetch_requested: expect.any(Boolean),
    });
    expect(Array.isArray(host.labels)).toBe(true);
    expect(
      host.labels.map((l) => l.name),
      'every host is in the builtin "All Hosts" label',
    ).toContain('All Hosts');
    expect(Array.isArray(host.policies), 'Policies tab reads host.policies').toBe(true);
    expect(host.issues?.failing_policies_count, 'Policies tab count').toEqual(expect.any(Number));
    expectNullOrArray(host.pack_stats, 'Reports tab reads host.pack_stats');
  });

  /**
   * Call: GET /hosts/:id?exclude_software=true, then GET /hosts/:id with no query.
   * Checks: the lean body has no software items. The default body includes a software array.
   * Why: the details header asks to omit software. The Software tab does not.
   */
  test(
    'exclude_software=true omits software; default includes it',
    { tag: '@regression' },
    async ({ api, knownHost }) => {
      const lean = await expectJson<HostResponse>(
        await api.get(`/hosts/${knownHost.id}`, { params: { exclude_software: true } }),
      );
      expect(lean.host.software ?? []).toEqual([]);
      const full = await expectJson<HostResponse>(await api.get(`/hosts/${knownHost.id}`));
      expect(Array.isArray(full.host.software)).toBe(true);
    },
  );

  /**
   * Call: GET /hosts/:id with an id that is not in the current list.
   * Checks: 404 whose reason matches "Host {id} was not found".
   * Why: a stale details link must not return another host.
   */
  test('unknown id returns 404 Host not found', { tag: '@regression' }, async ({ api, allHosts }) => {
    const id = missingHostId(allHosts);
    await expectFleetError(await api.get(`/hosts/${id}`), 404, { reason: hostNotFound(id) });
  });

  /**
   * Call: GET /hosts/abc.
   * Checks: 404. Fleet returns plain text for this path, not the JSON error envelope.
   * Why: a non-numeric id is a different 404 than a missing numeric id.
   */
  test('non-numeric id returns plain-text 404', { tag: '@regression' }, async ({ api }) => {
    await expectStatus(await api.get('/hosts/abc'), 404);
  });

  /**
   * Call: GET /hosts/0.
   * Checks: 404 with a reason matching "Host was not found".
   * Why: id 0 is numeric but never a real host.
   */
  test('id 0 returns 404', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(await api.get('/hosts/0'), 404, { reason: /Host was not found/ });
  });
});

/**
 * Call: GET /hosts/:id/software.
 * Checks: inventory shape, name search, an empty search, and an unknown host.
 * Why: the Software tab on host details.
 */
test.describe('API: GET /hosts/:id/software @api', () => {
  const params = DEFAULT_SOFTWARE_LIST;

  /** Fresh preview hosts report software a little after enrolling — wait briefly, then skip with a reason. */
  const waitForSoftware = async (api: FleetApiClient, id: number) => {
    let last = 0;
    await expect
      .poll(async () => (last = (await api.getHostSoftware(id)).count), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0)
      .catch(() => undefined);
    return last;
  };

  /**
   * Call: GET /hosts/:id/software with the Software tab defaults (page 0, 20 per page, name ascending).
   * Checks: count matches the polled inventory, page length is the smaller of count and 20, has_next_results is true only when count exceeds the page, each item has id, name, and source, and names are sorted ascending. Skips when the host has not reported software yet.
   * Why: the Software tab list.
   */
  test('returns inventory with count, items and meta', { tag: '@smoke' }, async ({ api, knownHost }) => {
    const count = await waitForSoftware(api, knownHost.id);
    test.skip(count === 0, `host ${knownHost.id} has not reported software yet (fresh preview); retry later`);

    const body = await expectJson<HostSoftwareResponse>(await api.get(`/hosts/${knownHost.id}/software`, { params }));
    expect(body.count).toBe(count);
    expect(body.software.length).toBe(Math.min(count, params.per_page));
    expect(body.meta).toEqual({ has_next_results: count > params.per_page, has_previous_results: false });
    for (const s of body.software) {
      expect(s).toMatchObject({ id: expect.any(Number), name: expect.any(String), source: expect.any(String) });
    }
    const names = body.software.map((s) => s.name.toLowerCase());
    expect(names, 'sorted by name asc').toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  /**
   * Call: GET /hosts/:id/software?query={first software name} with the same page defaults.
   * Checks: count is greater than 0 and no larger than the unfiltered count, and that name is still on the page. Skips when the host has no software.
   * Why: the Software tab search box.
   */
  test('query narrows results to matching names', { tag: '@regression' }, async ({ api, knownHost }) => {
    const total = await waitForSoftware(api, knownHost.id);
    test.skip(total === 0, 'no software reported yet');
    const first = (await expectJson<HostSoftwareResponse>(await api.get(`/hosts/${knownHost.id}/software`, { params })))
      .software[0].name;
    const res = await expectJson<HostSoftwareResponse>(
      await api.get(`/hosts/${knownHost.id}/software`, { params: { ...params, query: first } }),
    );
    expect(res.count).toBeGreaterThan(0);
    expect(res.count).toBeLessThanOrEqual(total);
    expect(res.software.map((s) => s.name)).toContain(first);
  });

  /**
   * Call: GET /hosts/:id/software with a query that matches no name.
   * Checks: software is [], count is 0, and both meta flags are false.
   * Why: the Software tab empty state.
   */
  test('no-match query returns count 0 and empty meta', { tag: '@regression' }, async ({ api, knownHost }) => {
    const res = await expectJson<HostSoftwareResponse>(
      await api.get(`/hosts/${knownHost.id}/software`, { params: { ...params, query: NO_MATCH_SOFTWARE_QUERY } }),
    );
    expect(res).toEqual({ software: [], count: 0, meta: { has_next_results: false, has_previous_results: false } });
  });

  /**
   * Call: GET /hosts/:id/software for an id that is not in the list.
   * Checks: 404 whose reason matches "Host {id} was not found".
   * Why: software for a missing host must not come back as an empty inventory.
   */
  test('unknown host returns 404', { tag: '@regression' }, async ({ api, allHosts }) => {
    const id = missingHostId(allHosts);
    await expectFleetError(await api.get(`/hosts/${id}/software`), 404, { reason: hostNotFound(id) });
  });
});

/**
 * Call: GET /hosts/:id/activities and GET /hosts/:id/activities/upcoming.
 * Checks: both feeds for a known host, and 404 for an unknown host.
 * Why: the Activity card on host details.
 */
test.describe('API: host activities @api', () => {
  const params = { page: 0, per_page: 8 } as const;

  /**
   * Call: GET /hosts/:id/activities?page=0&per_page=8.
   * Checks: activities is null or an array. meta.has_next_results and has_previous_results are booleans. A fresh preview returns null, not [].
   * Why: past activity on the details side card.
   */
  test('GET /hosts/:id/activities returns a list', { tag: '@regression' }, async ({ api, knownHost }) => {
    const body = await expectJson<ActivitiesResponse>(await api.get(`/hosts/${knownHost.id}/activities`, { params }));
    expectNullOrArray(body.activities, 'past activities are null or an array');
    expect(body.meta).toMatchObject({
      has_next_results: expect.any(Boolean),
      has_previous_results: expect.any(Boolean),
    });
  });

  /**
   * Call: GET /hosts/:id/activities/upcoming?page=0&per_page=8.
   * Checks: activities is an array, count is a number, and has_previous_results is false on page 0.
   * Why: upcoming activity on the same card.
   */
  test('GET /hosts/:id/activities/upcoming returns a list', { tag: '@regression' }, async ({ api, knownHost }) => {
    const body = await expectJson<ActivitiesResponse>(
      await api.get(`/hosts/${knownHost.id}/activities/upcoming`, { params }),
    );
    expect(Array.isArray(body.activities)).toBe(true);
    expect(body.count).toEqual(expect.any(Number));
    expect(body.meta.has_previous_results).toBe(false);
  });

  /**
   * Call: both activity routes for an id that is not in the list.
   * Checks: each is 404 whose reason matches "Host {id} was not found".
   * Why: a missing host must not come back as an empty activity feed.
   */
  test('activities for an unknown host return 404', { tag: '@regression' }, async ({ api, allHosts }) => {
    const id = missingHostId(allHosts);
    await expectFleetError(await api.get(`/hosts/${id}/activities`), 404, { reason: hostNotFound(id) });
    await expectFleetError(await api.get(`/hosts/${id}/activities/upcoming`), 404, { reason: hostNotFound(id) });
  });
});

/**
 * Call: POST /hosts/:id/refetch.
 * Checks: the Refetch request on a known host.
 * Why: host details asks the agent to report again.
 */
test.describe('API: POST /hosts/:id/refetch @api', () => {
  /**
   * Call: POST /hosts/:id/refetch, then GET /hosts/:id.
   * Checks: the post is 200 and refetch_requested is true.
   * Why: the header shows "Fetching fresh vitals" from this flag.
   */
  test('known host returns 200 and sets refetch_requested', { tag: '@smoke' }, async ({ api, knownHost }) => {
    await expectStatus(await api.post(`/hosts/${knownHost.id}/refetch`), 200);
    const host = await api.getHost(knownHost.id);
    expect(host.refetch_requested).toBe(true);
  });
});

/**
 * Call: DELETE /hosts/:id and POST /hosts/:id/refetch for an id that does not exist.
 * Checks: both are 404. Neither call targets a real host.
 * Why: the details actions must fail when the id is already gone.
 */
test.describe('API: host actions negative paths (non-destructive) @api', () => {
  /**
   * Call: DELETE /hosts/:id for an id that is not in the list.
   * Checks: 404 whose reason matches "Host {id} was not found".
   * Why: deleting a missing id must not succeed.
   */
  test('DELETE unknown host returns 404', { tag: '@regression' }, async ({ api, allHosts }) => {
    const id = missingHostId(allHosts);
    await expectFleetError(await api.delete(`/hosts/${id}`), 404, { reason: hostNotFound(id) });
  });

  /**
   * Call: POST /hosts/:id/refetch for an id that is not in the list.
   * Checks: 404 whose reason matches "Host {id} was not found".
   * Why: refetching a missing id must not succeed.
   */
  test('POST refetch on unknown host returns 404', { tag: '@regression' }, async ({ api, allHosts }) => {
    const id = missingHostId(allHosts);
    await expectFleetError(await api.post(`/hosts/${id}/refetch`), 404, { reason: hostNotFound(id) });
  });
});
