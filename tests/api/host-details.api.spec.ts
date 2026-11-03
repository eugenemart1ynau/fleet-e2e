import { test, expect } from '../../src/fixtures/api';
import { expectFleetError, expectJson, expectStatus } from '../../src/api/assertions';
import type { HostDetail, HostSoftwareResponse } from '../../src/api/types';
import { missingHostId } from '../../src/utils/apiData';

type HostBody = { host: HostDetail & { software?: unknown[] } };

test.describe('API: GET /hosts/:id @api @smoke', () => {
  test('returns the host with fields matching the list entry', async ({ api, knownHost }) => {
    const { host } = await expectJson<HostBody>(
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
    // Vitals fields shown on the details page are present and typed.
    expect(host).toMatchObject({
      memory: expect.any(Number),
      cpu_type: expect.any(String),
      hardware_model: expect.any(String),
      primary_mac: expect.any(String),
      osquery_version: expect.any(String),
      seen_time: expect.any(String),
      refetch_requested: expect.any(Boolean),
    });
    expect(Array.isArray(host.labels)).toBeTruthy();
    expect(host.labels.map((l) => l.name), 'every host is in the builtin "All Hosts" label').toContain('All Hosts');
  });

  test('exclude_software=true omits software; default includes it', async ({ api, knownHost }) => {
    const lean = await expectJson<HostBody>(await api.get(`/hosts/${knownHost.id}`, { params: { exclude_software: true } }));
    expect(lean.host.software ?? []).toEqual([]);
    const full = await expectJson<HostBody>(await api.get(`/hosts/${knownHost.id}`));
    expect(Array.isArray(full.host.software)).toBeTruthy();
  });

  test('unknown id returns 404 Host not found', async ({ api, allHosts }) => {
    const id = missingHostId(allHosts);
    await expectFleetError(await api.get(`/hosts/${id}`), 404, { reason: new RegExp(`Host ${id} was not found`) });
  });

  test('non-numeric id returns 404', async ({ api }) => {
    await expectStatus(await api.get('/hosts/abc'), 404);
  });

  test('id 0 returns 404', async ({ api }) => {
    await expectStatus(await api.get('/hosts/0'), 404);
  });
});

test.describe('API: GET /hosts/:id/software @api @smoke', () => {
  const params = { page: 0, per_page: 20, order_key: 'name', order_direction: 'asc' } as const;

  /** Fresh preview hosts report software a little after enrolling — wait briefly, then skip with a reason. */
  const waitForSoftware = async (api: import('../../src/api/FleetApiClient').FleetApiClient, id: number) => {
    let last = 0;
    await expect
      .poll(async () => (last = (await api.getHostSoftware(id)).count), { timeout: 30_000, intervals: [2_000] })
      .toBeGreaterThan(0)
      .catch(() => undefined);
    return last;
  };

  test('returns inventory with count, items and meta', async ({ api, knownHost }) => {
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

  test('query narrows results to matching names', async ({ api, knownHost }) => {
    const total = await waitForSoftware(api, knownHost.id);
    test.skip(total === 0, 'no software reported yet');
    const first = (await api.getHostSoftware(knownHost.id)).software[0].name;
    const res = await api.getHostSoftware(knownHost.id, first);
    expect(res.count).toBeGreaterThan(0);
    expect(res.count).toBeLessThanOrEqual(total);
    expect(res.software.map((s) => s.name)).toContain(first);
  });

  test('no-match query returns count 0 and empty meta', async ({ api, knownHost }) => {
    const res = await api.getHostSoftware(knownHost.id, 'zz-no-such-software-qa-7f3c');
    expect(res).toEqual({ software: [], count: 0, meta: { has_next_results: false, has_previous_results: false } });
  });

  test('unknown host returns 404', async ({ api, allHosts }) => {
    await expectStatus(await api.get(`/hosts/${missingHostId(allHosts)}/software`), 404);
  });
});

test.describe('API: host actions negative paths (non-destructive) @api', () => {
  test('DELETE unknown host returns 404', async ({ api, allHosts }) => {
    await expectStatus(await api.delete(`/hosts/${missingHostId(allHosts)}`), 404);
  });

  test('POST refetch on unknown host returns 404', async ({ api, allHosts }) => {
    await expectStatus(await api.post(`/hosts/${missingHostId(allHosts)}/refetch`), 404);
  });
});
