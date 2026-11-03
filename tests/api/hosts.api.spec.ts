import { test, expect } from '../../src/fixtures/api';
import { expectEvery, expectFleetError, expectJson } from '../../src/api/assertions';
import type { Host, HostStatus } from '../../src/api/types';
import { ids } from '../../src/utils/apiData';

type HostsBody = { hosts: Host[] };
type CountBody = { count: number };

const DEFAULT_LIST = { page: 0, per_page: 50, order_key: 'display_name', order_direction: 'asc' } as const;

test.describe('API: GET /hosts list and count @api @smoke', () => {
  test('list returns 200 with well-formed hosts', async ({ api }) => {
    const { hosts } = await expectJson<HostsBody>(await api.get('/hosts', { params: DEFAULT_LIST }));
    expect(hosts.length, 'preview has enrolled hosts').toBeGreaterThan(0);
    for (const h of hosts) {
      expect(h, `host ${h.id}`).toMatchObject({
        id: expect.any(Number),
        display_name: expect.any(String),
        hostname: expect.any(String),
        platform: expect.any(String),
        status: expect.stringMatching(/^(online|offline|mia|missing|new)$/),
        uuid: expect.any(String),
      });
    }
    expect(new Set(hosts.map((h) => h.id)).size, 'ids unique').toBe(hosts.length);
  });

  test('GET /hosts/count matches list length', async ({ api }) => {
    const { hosts } = await expectJson<HostsBody>(await api.get('/hosts', { params: DEFAULT_LIST }));
    const { count } = await expectJson<CountBody>(await api.get('/hosts/count'));
    test.skip(count > DEFAULT_LIST.per_page, `count ${count} exceeds one page; needs pagination-aware check`);
    expect(count).toBe(hosts.length);
  });

  test('order_direction desc is the reverse of asc', async ({ api }) => {
    const asc = await api.listHosts({ order_direction: 'asc' });
    const desc = await api.listHosts({ order_direction: 'desc' });
    expect(desc.map((h) => h.id)).toEqual([...asc].reverse().map((h) => h.id));
  });

  test('per_page/page paginate without overlap', async ({ api, allHosts }) => {
    test.skip(allHosts.length < 2, 'needs at least 2 hosts');
    const p0 = await api.listHosts({ per_page: 1, page: 0 });
    const p1 = await api.listHosts({ per_page: 1, page: 1 });
    expect(p0).toHaveLength(1);
    expect(p1).toHaveLength(1);
    expect(p0[0].id).not.toBe(p1[0].id);
    expect([p0[0].id, p1[0].id]).toEqual(allHosts.slice(0, 2).map((h) => h.id));
  });

  test('page past the end returns an empty list', async ({ api, allHosts }) => {
    expect(await api.listHosts({ per_page: 50, page: Math.ceil(allHosts.length / 50) + 1 })).toEqual([]);
  });

  test('invalid status returns 400', async ({ api }) => {
    await expectFleetError(await api.get('/hosts', { params: { status: 'bogus' } }), 400, {
      reason: /Invalid status: bogus/,
    });
  });

  test('invalid order_key returns 422', async ({ api }) => {
    await expectFleetError(await api.get('/hosts', { params: { order_key: 'not_a_column' } }), 422);
  });
});

test.describe('API: status filter @api', () => {
  const statuses: HostStatus[] = ['online', 'offline', 'new', 'missing', 'mia'];

  for (const status of statuses) {
    test(`status=${status}: list is a subset of all hosts and matches count`, async ({ api, allHosts }) => {
      const filtered = await api.listHosts({ status });
      const count = await api.countHosts({ status });
      expect(count, 'count == list length').toBe(filtered.length);
      const all = new Set(allHosts.map((h) => h.id));
      expectEvery(filtered, (h) => all.has(h.id), 'filtered ⊆ all', (h) => h.id);
      // `new` and `missing` are time-based overlays; the host's own `status` field stays online/offline.
      if (status === 'online' || status === 'offline') {
        expectEvery(filtered, (h) => h.status === status, `every host is ${status}`, (h) => `${h.id}:${h.status}`);
      }
    });
  }

  test('online + offline partition the online/offline hosts', async ({ api, allHosts }) => {
    const online = await api.listHosts({ status: 'online' });
    const offline = await api.listHosts({ status: 'offline' });
    expect(ids(online).filter((id) => ids(offline).includes(id)), 'no overlap').toEqual([]);
    expect(ids(online)).toEqual(ids(allHosts.filter((h) => h.status === 'online')));
    expect(ids(offline)).toEqual(ids(allHosts.filter((h) => h.status === 'offline')));
  });
});

test.describe('API: search (?query=) @api @smoke', () => {
  test('exact hostname returns that host and a subset of all hosts', async ({ api, knownHost, allHosts }) => {
    const res = await api.listHosts({ query: knownHost.hostname });
    expect(res.map((h) => h.id)).toContain(knownHost.id);
    expect(res.length).toBeLessThanOrEqual(allHosts.length);
    expect(await api.countHosts({ query: knownHost.hostname })).toBe(res.length);
  });

  test('partial hostname matches (prefix)', async ({ api, knownHost }) => {
    const prefix = knownHost.hostname.slice(0, 4);
    const res = await api.listHosts({ query: prefix });
    expect(res.map((h) => h.id)).toContain(knownHost.id);
    expectEvery(
      res,
      (h) => [h.hostname, h.display_name, h.computer_name, h.uuid, h.hardware_serial, h.primary_ip]
        .some((f) => (f ?? '').toLowerCase().includes(prefix.toLowerCase())),
      `every result matches "${prefix}" in a searchable field`,
      (h) => h.display_name,
    );
  });

  test('uuid returns exactly that host', async ({ api, knownHost }) => {
    expect((await api.listHosts({ query: knownHost.uuid })).map((h) => h.id)).toEqual([knownHost.id]);
  });

  test('primary_ip finds the host', async ({ api, knownHost }) => {
    test.skip(!knownHost.primary_ip, 'host has no primary_ip');
    expect((await api.listHosts({ query: knownHost.primary_ip })).map((h) => h.id)).toContain(knownHost.id);
  });

  test('hardware_serial finds the host', async ({ api, allHosts }) => {
    const withSerial = allHosts.find((h) => h.hardware_serial);
    test.skip(!withSerial, 'no host on this preview reports a hardware_serial (simulated Linux hosts have none)');
    expect((await api.listHosts({ query: withSerial!.hardware_serial })).map((h) => h.id)).toContain(withSerial!.id);
  });

  test('search is case-insensitive', async ({ api, knownHost }) => {
    const upper = await api.listHosts({ query: knownHost.hostname.toUpperCase() });
    expect(upper.map((h) => h.id)).toContain(knownHost.id);
  });

  test('no match returns empty list and count 0', async ({ api }) => {
    const q = 'zz-no-such-host-qa-7f3c';
    expect(await api.listHosts({ query: q })).toEqual([]);
    expect(await api.countHosts({ query: q })).toBe(0);
  });

  test('whitespace-only query returns all hosts', async ({ api, allHosts }) => {
    expect(ids(await api.listHosts({ query: '   ' }))).toEqual(ids(allHosts));
  });

  test('SQL wildcard % is treated literally', async ({ api, allHosts }) => {
    test.skip(allHosts.some((h) => `${h.hostname}${h.display_name}`.includes('%')), 'a host name contains %');
    expect(await api.countHosts({ query: '%' })).toBe(0);
  });

  test('query combined with status=online narrows both ways', async ({ api, knownHost }) => {
    const res = await api.listHosts({ query: knownHost.uuid, status: 'online' });
    expect(res.map((h) => h.id)).toEqual(knownHost.status === 'online' ? [knownHost.id] : []);
    if (knownHost.status === 'online') {
      expect(await api.listHosts({ query: knownHost.uuid, status: 'offline' })).toEqual([]);
    }
  });
});
