import { test, expect } from '../../src/fixtures/api';
import { DEFAULT_HOST_LIST } from '../../src/api/FleetApiClient';
import { expectEvery, expectFleetError, expectJson, expectStatus } from '../../src/api/assertions';
import type {
  CountResponse,
  EnrollSecretSpec,
  Host,
  HostsResponse,
  HostStatus,
  LabelsResponse,
} from '../../src/api/types';
import { absentId, csvValue, ids, NO_MATCH_HOST_QUERY, parseCsv } from '../../src/utils/apiData';

/**
 * Call: GET /hosts and GET /hosts/count.
 * Checks: list shape, sort, pagination, bad query params, and the device_mapping flag the Hosts page sends.
 * Why: /hosts/manage loads and sorts from these two routes.
 */
test.describe('API: GET /hosts list and count @api', () => {
  /**
   * Call: GET /hosts with the Hosts page defaults (page 0, 50 per page, display_name ascending).
   * Checks: 200, at least one host, id, display_name, hostname, platform, status, and uuid are present, status is online, offline, mia, missing, or new, and ids are unique.
   * Why: this is the list the Hosts table renders on load.
   */
  test('list returns 200 with well-formed hosts', { tag: '@smoke' }, async ({ api }) => {
    const { hosts } = await expectJson<HostsResponse>(await api.get('/hosts', { params: DEFAULT_HOST_LIST }));
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

  /**
   * Call: GET /hosts for every page, then GET /hosts/count with no query.
   * Checks: count equals the full list length, including fleets larger than one page of 50.
   * Why: the Hosts page count chip and the table must agree.
   */
  test('GET /hosts/count matches list length', { tag: '@smoke' }, async ({ api }) => {
    const hosts = await api.listAllHosts();
    const { count } = await expectJson<CountResponse>(await api.get('/hosts/count'));
    expect(count).toBe(hosts.length);
  });

  /**
   * Call: GET /hosts with order_direction asc, then the same call with desc. Both use the default order_key display_name.
   * Checks: the desc id list is the asc id list reversed.
   * Why: the display_name header toggles this direction.
   */
  test('order_direction desc is the reverse of asc', { tag: '@regression' }, async ({ api }) => {
    const asc = await api.listHosts({ order_direction: 'asc' });
    const desc = await api.listHosts({ order_direction: 'desc' });
    expect(desc.map((h) => h.id)).toEqual([...asc].reverse().map((h) => h.id));
  });

  /**
   * Call: GET /hosts?order_direction=asc for hostname, seen_time, platform, os_version, and issues.
   * Checks: each returns the same host ids as the unfiltered list. These cases check the set, not the sort order. status is display-only and is rejected in the next test.
   * Why: those are the other sortable Hosts table headers.
   */
  for (const order_key of ['hostname', 'seen_time', 'platform', 'os_version', 'issues'] as const) {
    test(
      `order_key=${order_key} returns 200 with the same host set`,
      { tag: '@regression' },
      async ({ api, allHosts }) => {
        const ordered = await api.listAllHosts({ order_key, order_direction: 'asc' });
        expect(ids(ordered)).toEqual(ids(allHosts));
      },
    );
  }

  /**
   * Call: GET /hosts?order_key=status.
   * Checks: 422.
   * Why: the status column is a filter, not a sort. The API rejects it.
   */
  test('order_key=status returns 422', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(await api.get('/hosts', { params: { order_key: 'status' } }), 422);
  });

  /**
   * Call: GET /hosts?per_page=1&page=0 and the same call with page=1.
   * Checks: each page has one host, the ids differ, and those two ids are the first two of the default list. Skips when fewer than two hosts exist.
   * Why: the Hosts table pages with these params once the fleet is larger than one page.
   */
  test('per_page/page paginate without overlap', { tag: '@regression' }, async ({ api, allHosts }) => {
    test.skip(allHosts.length < 2, 'needs at least 2 hosts');
    const p0 = await api.listHosts({ per_page: 1, page: 0 });
    const p1 = await api.listHosts({ per_page: 1, page: 1 });
    expect(p0).toHaveLength(1);
    expect(p1).toHaveLength(1);
    expect(p0[0].id).not.toBe(p1[0].id);
    expect([p0[0].id, p1[0].id]).toEqual(allHosts.slice(0, 2).map((h) => h.id));
  });

  /**
   * Call: GET /hosts?per_page=50 with a page one past the last page.
   * Checks: the host list is empty.
   * Why: a deep link to a page that no longer exists must not repeat the first page.
   */
  test('page past the end returns an empty list', { tag: '@regression' }, async ({ api, allHosts }) => {
    expect(await api.listHosts({ per_page: 50, page: Math.ceil(allHosts.length / 50) + 1 })).toEqual([]);
  });

  /**
   * Call: GET /hosts?status=bogus.
   * Checks: 400 with a reason matching "Invalid status: bogus".
   * Why: a bad status deep link must fail instead of returning the full fleet.
   */
  test('invalid status returns 400', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(await api.get('/hosts', { params: { status: 'bogus' } }), 400, {
      reason: /Invalid status: bogus/,
    });
  });

  /**
   * Call: GET /hosts?order_key=not_a_column.
   * Checks: 422.
   * Why: an unknown sort column must not be silently ignored.
   */
  test('invalid order_key returns 422', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(await api.get('/hosts', { params: { order_key: 'not_a_column' } }), 422);
  });

  /**
   * Call: GET /hosts with the page defaults, then the same call with device_mapping=true.
   * Checks: both responses have the same ids. The plain response omits device_mapping. The flagged response includes the key on every host.
   * Why: the Hosts page always sends device_mapping=true.
   */
  test(
    'device_mapping=true is the Hosts page list call and keeps the same ids',
    { tag: '@regression' },
    async ({ api }) => {
      const plain = await expectJson<HostsResponse>(await api.get('/hosts', { params: DEFAULT_HOST_LIST }));
      const withMapping = await expectJson<{ hosts: Array<Host & { device_mapping?: unknown }> }>(
        await api.get('/hosts', { params: { ...DEFAULT_HOST_LIST, device_mapping: true } }),
      );
      expect(ids(withMapping.hosts)).toEqual(ids(plain.hosts));
      expect(
        plain.hosts.every((h) => !('device_mapping' in h)),
        'omitted unless requested',
      ).toBe(true);
      expect(
        withMapping.hosts.every((h) => 'device_mapping' in h),
        'page always requests device_mapping',
      ).toBe(true);
    },
  );
});

/**
 * Call: GET /hosts and GET /hosts/count with a status query.
 * Checks: online, offline, new, missing, and mia, plus that online and offline do not overlap.
 * Why: the Hosts status filter.
 */
test.describe('API: status filter @api', () => {
  const statuses: HostStatus[] = ['online', 'offline', 'new', 'missing', 'mia'];

  /**
   * Call: GET /hosts?status= and GET /hosts/count?status= for online, offline, new, missing, and mia.
   * Checks: count equals the filtered list across every page, and every filtered id is in the full list. For online and offline, every host's own status field matches. new and missing are time-based overlays, so the host status field stays online or offline. online is @smoke. The other four are @regression.
   * Why: each status chip on the Hosts page.
   */
  for (const status of statuses) {
    test(
      `status=${status}: list is a subset of all hosts and matches count`,
      {
        tag: status === 'online' ? '@smoke' : '@regression',
      },
      async ({ api, allHosts }) => {
        const filtered = await api.listAllHosts({ status });
        const count = await api.countHosts({ status });
        expect(count, 'count == list length').toBe(filtered.length);
        const all = new Set(allHosts.map((h) => h.id));
        expectEvery(
          filtered,
          (h) => all.has(h.id),
          'filtered ⊆ all',
          (h) => h.id,
        );
        // new, missing, and mia are overlays. The host's own status stays online or offline.
        if (status === 'online' || status === 'offline') {
          expectEvery(
            filtered,
            (h) => h.status === status,
            `every host is ${status}`,
            (h) => `${h.id}:${h.status}`,
          );
        }
      },
    );
  }

  /**
   * Call: GET /hosts?status=online and GET /hosts?status=offline.
   * Checks: the two id lists do not overlap, and each matches the full list split by the host status field.
   * Why: a host must not appear under both Online and Offline.
   */
  test('online + offline partition the online/offline hosts', { tag: '@regression' }, async ({ api, allHosts }) => {
    const online = await api.listAllHosts({ status: 'online' });
    const offline = await api.listAllHosts({ status: 'offline' });
    expect(
      ids(online).filter((id) => ids(offline).includes(id)),
      'no overlap',
    ).toEqual([]);
    expect(ids(online)).toEqual(ids(allHosts.filter((h) => h.status === 'online')));
    expect(ids(offline)).toEqual(ids(allHosts.filter((h) => h.status === 'offline')));
  });
});

/**
 * Call: GET /hosts?query= and GET /hosts/count?query=.
 * Checks: hostname, prefix, uuid, IP, serial, computer name, case, empty results, whitespace, and SQL wildcard characters.
 * Why: the Hosts search box and its ?query= deep link.
 */
test.describe('API: search (?query=) @api', () => {
  /**
   * Call: GET /hosts?query={hostname} and GET /hosts/count with the same query.
   * Checks: the known host is in the list, the list is no longer than the full fleet, and count equals the list length.
   * Why: searching the visible hostname is the primary lookup.
   */
  test(
    'exact hostname returns that host and a subset of all hosts',
    { tag: '@smoke' },
    async ({ api, knownHost, allHosts }) => {
      const res = await api.listHosts({ query: knownHost.hostname });
      expect(res.map((h) => h.id)).toContain(knownHost.id);
      expect(res.length).toBeLessThanOrEqual(allHosts.length);
      expect(await api.countHosts({ query: knownHost.hostname })).toBe(res.length);
    },
  );

  /**
   * Call: GET /hosts?query= with the first four characters of the hostname.
   * Checks: the known host is included, and every result matches that prefix in hostname, display_name, computer_name, uuid, hardware_serial, or primary_ip.
   * Why: the search box matches as the user types.
   */
  test('partial hostname matches (prefix)', { tag: '@regression' }, async ({ api, knownHost }) => {
    const prefix = knownHost.hostname.slice(0, 4);
    const res = await api.listHosts({ query: prefix });
    expect(res.map((h) => h.id)).toContain(knownHost.id);
    expectEvery(
      res,
      (h) =>
        [h.hostname, h.display_name, h.computer_name, h.uuid, h.hardware_serial, h.primary_ip].some((f) =>
          (f ?? '').toLowerCase().includes(prefix.toLowerCase()),
        ),
      `every result matches "${prefix}" in a searchable field`,
      (h) => h.display_name,
    );
  });

  /**
   * Call: GET /hosts?query={uuid}.
   * Checks: the result is exactly that one host id.
   * Why: a pasted host uuid must not return neighbors.
   */
  test('uuid returns exactly that host', { tag: '@regression' }, async ({ api, knownHost }) => {
    expect((await api.listHosts({ query: knownHost.uuid })).map((h) => h.id)).toEqual([knownHost.id]);
  });

  /**
   * Call: GET /hosts?query={primary_ip}.
   * Checks: the known host id is in the results. Skips when the host has no primary_ip.
   * Why: operators search by IP from the details page.
   */
  test('primary_ip finds the host', { tag: '@regression' }, async ({ api, knownHost }) => {
    test.skip(!knownHost.primary_ip, 'host has no primary_ip');
    expect((await api.listHosts({ query: knownHost.primary_ip })).map((h) => h.id)).toContain(knownHost.id);
  });

  /**
   * Call: GET /hosts?query={hardware_serial} for the first host that reports one.
   * Checks: that host id is in the results. Simulated Linux hosts leave this blank, so the host that reports a serial is the one searched.
   * Why: serial is one of the fields the search box matches.
   */
  test('hardware_serial finds the host', { tag: '@regression' }, async ({ api, allHosts }) => {
    const withSerial = allHosts.find((h) => h.hardware_serial.trim() !== '');
    expect(withSerial, 'an enrolled host must report hardware_serial').toBeTruthy();
    expect((await api.listHosts({ query: withSerial!.hardware_serial })).map((h) => h.id)).toContain(withSerial!.id);
  });

  /**
   * Call: GET /hosts?query= with the hostname in uppercase.
   * Checks: the known host id is in the results.
   * Why: the search box does not require the user to match case.
   */
  test('search is case-insensitive', { tag: '@regression' }, async ({ api, knownHost }) => {
    const upper = await api.listHosts({ query: knownHost.hostname.toUpperCase() });
    expect(upper.map((h) => h.id)).toContain(knownHost.id);
  });

  /**
   * Call: GET /hosts?query= and GET /hosts/count?query= with a string that matches no host.
   * Checks: the list is empty and the count is 0.
   * Why: the Hosts empty state.
   */
  test('no match returns empty list and count 0', { tag: '@regression' }, async ({ api }) => {
    const q = NO_MATCH_HOST_QUERY;
    expect(await api.listHosts({ query: q })).toEqual([]);
    expect(await api.countHosts({ query: q })).toBe(0);
  });

  /**
   * Call: GET /hosts?query= with three spaces.
   * Checks: the returned ids equal the full host list.
   * Why: a blank search must not hide the fleet.
   */
  test('whitespace-only query returns all hosts', { tag: '@regression' }, async ({ api, allHosts }) => {
    expect(ids(await api.listAllHosts({ query: '   ' }))).toEqual(ids(allHosts));
  });

  /**
   * Call: GET /hosts/count?query=% .
   * Checks: the count is 0. Skips when a hostname or display name already contains %.
   * Why: % must be a literal character, not a SQL match-all.
   */
  test('SQL wildcard % is treated literally', { tag: '@regression' }, async ({ api, allHosts }) => {
    test.skip(
      allHosts.some((h) => `${h.hostname}${h.display_name}`.includes('%')),
      'a host name contains %',
    );
    expect(await api.countHosts({ query: '%' })).toBe(0);
  });

  /**
   * Call: GET /hosts/count?query=_ and GET /hosts?query=_ .
   * Checks: the count is 0 and the list is empty. Skips when a hostname or display name already contains _.
   * Why: _ must be a literal character, not a SQL single-character wildcard.
   */
  test('SQL wildcard _ is treated literally', { tag: '@regression' }, async ({ api, allHosts }) => {
    test.skip(
      allHosts.some((h) => `${h.hostname}${h.display_name}`.includes('_')),
      'a host name contains _',
    );
    expect(await api.countHosts({ query: '_' })).toBe(0);
    expect(await api.listHosts({ query: '_' })).toEqual([]);
  });

  /**
   * Call: GET /hosts?query={computer_name} for a host whose computer_name differs from its hostname.
   * Checks: that host id is in the results. Simulated Linux copies the hostname into computer_name, so the host with a distinct computer name is the one searched.
   * Why: the search box matches the computer name shown on the host, not only the hostname.
   */
  test(
    'computer_name finds the host when it differs from hostname',
    { tag: '@regression' },
    async ({ api, allHosts }) => {
      const named = allHosts.find((h) => h.computer_name.trim() !== '' && h.computer_name !== h.hostname);
      expect(named, 'an enrolled host must report a computer_name different from its hostname').toBeTruthy();
      expect((await api.listHosts({ query: named!.computer_name })).map((h) => h.id)).toContain(named!.id);
    },
  );

  /**
   * Call: GET /hosts?query={uuid}&status=online, and the same query with status=offline when the host is online.
   * Checks: an online host is the only result for status=online and is absent for status=offline. An offline host yields an empty online result.
   * Why: search and the status filter are applied together.
   */
  test('query combined with status=online narrows both ways', { tag: '@regression' }, async ({ api, knownHost }) => {
    const res = await api.listHosts({ query: knownHost.uuid, status: 'online' });
    expect(res.map((h) => h.id)).toEqual(knownHost.status === 'online' ? [knownHost.id] : []);
    // The opposite status must exclude this host. An offline host has nothing to exclude.
    if (knownHost.status === 'online') {
      expect(await api.listHosts({ query: knownHost.uuid, status: 'offline' })).toEqual([]);
    }
  });
});

/**
 * Call: GET /hosts/report.
 * Checks: CSV columns and rows, status and query filters, a no-match export, and bad format or column params.
 * Why: the Hosts page Export hosts download.
 */
test.describe('API: GET /hosts/report (CSV export) @api', () => {
  const columns = ['display_name', 'hostname', 'uuid', 'status', 'platform'] as const;

  /**
   * Call: GET /hosts/report?format=csv&columns=display_name,hostname,uuid,status,platform.
   * Checks: 200, content-type is text/csv, the header row is those columns in that order, the row count equals the host list, and each host's display_name, hostname, status, and platform match the API row.
   * Why: the default export must contain the hosts the table is showing.
   */
  test('returns text/csv with requested columns and one row per host', { tag: '@smoke' }, async ({ api, allHosts }) => {
    const res = await api.get('/hosts/report', {
      params: { format: 'csv', columns: columns.join(',') },
    });
    await expectStatus(res, 200);
    expect(res.headers()['content-type'] ?? '', 'CSV content-type').toMatch(/text\/csv/);

    const { headers, rows } = parseCsv(await res.text());
    expect(headers).toEqual([...columns]);
    expect(rows.length, 'row count == list length').toBe(allHosts.length);

    const byUuid = new Map(rows.map((r) => [csvValue(headers, r, 'uuid'), r]));
    for (const h of allHosts) {
      const row = byUuid.get(h.uuid);
      expect(row, `CSV includes host ${h.id} (${h.uuid})`).toBeTruthy();
      expect(csvValue(headers, row!, 'display_name')).toBe(h.display_name);
      expect(csvValue(headers, row!, 'hostname')).toBe(h.hostname);
      expect(csvValue(headers, row!, 'status')).toBe(h.status);
      expect(csvValue(headers, row!, 'platform')).toBe(h.platform);
    }
  });

  /**
   * Call: GET /hosts/report?format=csv&columns=display_name,uuid,status&status=online.
   * Checks: 200, every row's status is online, and the uuids match the online hosts from the list.
   * Why: exporting while the Online filter is on must not include other hosts.
   */
  test('status=online keeps only online hosts', { tag: '@regression' }, async ({ api, allHosts }) => {
    const res = await api.get('/hosts/report', {
      params: { format: 'csv', columns: 'display_name,uuid,status', status: 'online' },
    });
    await expectStatus(res, 200);
    const { headers, rows } = parseCsv(await res.text());
    expectEvery(
      rows,
      (r) => csvValue(headers, r, 'status') === 'online',
      'every CSV row is online',
      (r) => csvValue(headers, r, 'uuid'),
    );
    expect(rows.map((r) => csvValue(headers, r, 'uuid')).sort()).toEqual(
      allHosts
        .filter((h) => h.status === 'online')
        .map((h) => h.uuid)
        .sort(),
    );
  });

  /**
   * Call: GET /hosts/report?format=csv&columns=display_name,uuid&query={uuid}.
   * Checks: 200 and the only data row is that uuid.
   * Why: exporting a search result must match GET /hosts for the same query.
   */
  test('query narrows rows the same way as GET /hosts', { tag: '@regression' }, async ({ api, knownHost }) => {
    const res = await api.get('/hosts/report', {
      params: { format: 'csv', columns: 'display_name,uuid', query: knownHost.uuid },
    });
    await expectStatus(res, 200);
    const { headers, rows } = parseCsv(await res.text());
    expect(rows.map((r) => csvValue(headers, r, 'uuid'))).toEqual([knownHost.uuid]);
  });

  /**
   * Call: GET /hosts/report?format=csv&columns=display_name with a query that matches no host.
   * Checks: 200, the header is display_name, and there are no data rows.
   * Why: an empty search still downloads a header, not an error.
   */
  test('no-match query returns header only', { tag: '@regression' }, async ({ api }) => {
    const res = await api.get('/hosts/report', {
      params: { format: 'csv', columns: 'display_name', query: NO_MATCH_HOST_QUERY },
    });
    await expectStatus(res, 200);
    const { headers, rows } = parseCsv(await res.text());
    expect(headers).toEqual(['display_name']);
    expect(rows).toEqual([]);
  });

  /**
   * Call: GET /hosts/report with no query params.
   * Checks: 400 with a reason matching "Param format is required".
   * Why: the export always sends format=csv. A bare call must say what is missing.
   */
  test('missing format returns 400', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(await api.get('/hosts/report'), 400, {
      reason: /Param format is required/i,
    });
  });

  /**
   * Call: GET /hosts/report?format=json.
   * Checks: 415 with a reason matching "unsupported or unspecified report format".
   * Why: the Hosts download is CSV. Another format is not accepted.
   */
  test('unsupported format returns 415', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(await api.get('/hosts/report', { params: { format: 'json' } }), 415, {
      reason: /unsupported or unspecified report format/i,
    });
  });

  /**
   * Call: GET /hosts/report?format=csv&columns=not_a_real_column.
   * Checks: 400 with a reason matching "invalid column name".
   * Why: Edit columns must not be able to request a column the report does not know.
   */
  test('unknown column name returns 400', { tag: '@regression' }, async ({ api }) => {
    await expectFleetError(
      await api.get('/hosts/report', { params: { format: 'csv', columns: 'not_a_real_column' } }),
      400,
      { reason: /invalid column name/ },
    );
  });

  /**
   * Call: GET /labels/:id/hosts for All Linux, then GET /hosts/report?format=csv&columns=display_name,platform,uuid&label_id={that id}.
   * Checks: 200, the CSV row count and uuids match that label's hosts, and no row has platform darwin.
   * Why: exporting from a platform filter must stay inside that label. label_id filters the report even though it does not filter GET /hosts.
   */
  test('label_id narrows CSV rows to that label', { tag: '@regression' }, async ({ api }) => {
    const linux = await api.requireLabel('All Linux');
    const labeled = await expectJson<HostsResponse>(
      await api.get(`/labels/${linux.id}/hosts`, { params: DEFAULT_HOST_LIST }),
    );
    const res = await api.get('/hosts/report', {
      params: { format: 'csv', columns: 'display_name,platform,uuid', label_id: linux.id },
    });
    await expectStatus(res, 200);
    const { headers, rows } = parseCsv(await res.text());
    expect(rows.length).toBe(labeled.hosts.length);
    expect(rows.map((r) => csvValue(headers, r, 'uuid')).sort()).toEqual(labeled.hosts.map((h) => h.uuid).sort());
    expectEvery(
      rows,
      (r) => csvValue(headers, r, 'platform') !== 'darwin',
      'CSV platforms are non-darwin for All Linux',
      (r) => csvValue(headers, r, 'platform'),
    );
  });
});

/**
 * Call: GET /labels, GET /labels/:id/hosts, and GET /hosts/count?label_id=.
 * Checks: builtin platform labels, Linux and macOS membership, status and query on a label, a missing label, and the GET /hosts?label_id= footgun.
 * Why: the platform filter on /hosts/manage. The page uses /labels/:id/hosts. label_id on GET /hosts does not filter.
 */
test.describe('API: labels (platform / label filter on Hosts) @api', () => {
  /**
   * Call: GET /labels.
   * Checks: the list is non-empty and includes All Hosts, All Linux, and macOS.
   * Why: those are the builtin filters in the Hosts platform menu.
   */
  test(
    'GET /labels includes Hosts filter builtins (All Hosts, All Linux, macOS)',
    { tag: '@smoke' },
    async ({ api }) => {
      const { labels } = await expectJson<LabelsResponse>(await api.get('/labels'));
      expect(labels.length).toBeGreaterThan(0);
      for (const name of ['All Hosts', 'All Linux', 'macOS']) {
        expect(
          labels.map((l) => l.name),
          name,
        ).toContain(name);
      }
    },
  );

  /**
   * Call: GET /labels/:id/hosts for All Linux, and GET /hosts/count?label_id={that id}.
   * Checks: at least one host, none are darwin or windows, the count equals the list length, and the count matches the label's host_count or count.
   * Why: choosing Linux in the platform menu loads this route.
   */
  test(
    'GET /labels/:id/hosts for All Linux returns only linux platforms and matches count',
    { tag: '@smoke' },
    async ({ api }) => {
      const linux = await api.requireLabel('All Linux');
      const { hosts } = await expectJson<HostsResponse>(
        await api.get(`/labels/${linux.id}/hosts`, { params: DEFAULT_HOST_LIST }),
      );
      expect(hosts.length).toBeGreaterThan(0);
      expectEvery(
        hosts,
        (h) => h.platform !== 'darwin' && h.platform !== 'windows',
        'All Linux hosts are non-darwin/windows',
        (h) => `${h.id}:${h.platform}`,
      );
      const { count } = await expectJson<CountResponse>(
        await api.get('/hosts/count', { params: { label_id: linux.id } }),
      );
      expect(count).toBe(hosts.length);
      expect(count).toBe(linux.host_count ?? linux.count ?? count);
    },
  );

  /**
   * Call: GET /labels/:id/hosts for the macOS label.
   * Checks: every host has platform darwin.
   * Why: choosing macOS in the platform menu.
   */
  test('GET /labels/:id/hosts for macOS returns only darwin', { tag: '@regression' }, async ({ api }) => {
    const mac = await api.requireLabel('macOS');
    const { hosts } = await expectJson<HostsResponse>(
      await api.get(`/labels/${mac.id}/hosts`, { params: DEFAULT_HOST_LIST }),
    );
    expectEvery(
      hosts,
      (h) => h.platform === 'darwin',
      'macOS label is darwin-only',
      (h) => h.platform,
    );
  });

  /**
   * Call: GET /labels/:id/hosts for All Linux with status=online.
   * Checks: every returned host has status online.
   * Why: the platform filter and the Online chip can be on at the same time.
   */
  test('label hosts + status=online keeps online subset', { tag: '@regression' }, async ({ api }) => {
    const linux = await api.requireLabel('All Linux');
    const { hosts } = await expectJson<HostsResponse>(
      await api.get(`/labels/${linux.id}/hosts`, {
        params: { ...DEFAULT_HOST_LIST, status: 'online' },
      }),
    );
    expectEvery(
      hosts,
      (h) => h.status === 'online',
      'online under label',
      (h) => `${h.id}:${h.status}`,
    );
  });

  /**
   * Call: GET /labels/:id/hosts for All Linux with a query that matches no host.
   * Checks: the host list is empty.
   * Why: search inside a platform filter can legitimately match nothing.
   */
  test('label hosts + no-match query returns empty list', { tag: '@regression' }, async ({ api }) => {
    const linux = await api.requireLabel('All Linux');
    const { hosts } = await expectJson<HostsResponse>(
      await api.get(`/labels/${linux.id}/hosts`, {
        params: { ...DEFAULT_HOST_LIST, query: NO_MATCH_HOST_QUERY },
      }),
    );
    expect(hosts).toEqual([]);
  });

  /**
   * Call: GET /labels/:id and GET /labels/:id/hosts for an id that is not in GET /labels.
   * Checks: the label route is 404 with reason "Label {id} was not found". The hosts route is 200 with an empty list.
   * Why: a deleted label must not fall through to the full fleet.
   */
  test('unknown label id is 404; its hosts route is an empty 200', { tag: '@regression' }, async ({ api }) => {
    const { labels } = await expectJson<LabelsResponse>(await api.get('/labels'));
    const id = absentId(labels.map((l) => l.id));
    await expectFleetError(await api.get(`/labels/${id}`), 404, {
      reason: new RegExp(`Label ${id} was not found`),
    });
    const { hosts } = await expectJson<HostsResponse>(
      await api.get(`/labels/${id}/hosts`, { params: DEFAULT_HOST_LIST }),
    );
    expect(hosts, 'missing label hosts is empty, not the full fleet').toEqual([]);
  });

  /**
   * Call: GET /hosts with the page defaults plus label_id set to All Linux.
   * Checks: the returned ids equal the unfiltered host list. On this Fleet build, label_id on GET /hosts is ignored. The UI uses GET /labels/:id/hosts instead.
   * Why: a test that filters with GET /hosts?label_id= would pass while the page is broken.
   */
  test(
    'GET /hosts?label_id= does not filter (UI uses /labels/:id/hosts instead)',
    { tag: '@regression' },
    async ({ api, allHosts }) => {
      const linux = await api.requireLabel('All Linux');
      const hosts = await api.listAllHosts({ label_id: linux.id });
      expect(ids(hosts)).toEqual(ids(allHosts));
    },
  );
});

/**
 * Call: PATCH the current user's hidden_host_columns, then GET /users.
 * Checks: the Edit columns choice is stored on the user and can be read back.
 * Why: hiding a Hosts column is a server setting, not only a browser preference.
 */
test.describe('API: edit columns (hidden_host_columns) @api', () => {
  /**
   * Call: PATCH hidden_host_columns to hardware_model and cpu_type, then to an empty list. The previous value is restored afterward. Each write is read with GET /users.
   * Checks: the first read equals those two columns, and the second read is an empty list.
   * Why: Edit columns persists through hidden_host_columns.
   */
  test('PATCH persists hidden_host_columns (readable via GET /users)', { tag: '@regression' }, async ({ api }) => {
    const before = await api.getHiddenHostColumns();
    const hide = ['hardware_model', 'cpu_type'];
    try {
      await api.setHiddenHostColumns(hide);
      expect(await api.getHiddenHostColumns()).toEqual(hide);

      await api.setHiddenHostColumns([]);
      expect(await api.getHiddenHostColumns()).toEqual([]);
    } finally {
      await api.setHiddenHostColumns(before.length ? before : []);
    }
  });
});

/**
 * Call: GET /spec/enroll_secret.
 * Checks: the Add hosts modal can read a secret. This group does not POST a new secret. A partial body cleared the preview secret once.
 * Why: Add hosts and Enroll secrets show the secret from this read.
 */
test.describe('API: enroll secrets (Add hosts / Enroll secrets modals) @api', () => {
  /**
   * Call: GET /spec/enroll_secret.
   * Checks: spec.secrets has at least one entry, and the first secret is longer than 5 characters.
   * Why: the Add hosts modal prints this secret in the install command.
   */
  test('GET /spec/enroll_secret returns at least one secret', { tag: '@smoke' }, async ({ api }) => {
    const body = await expectJson<EnrollSecretSpec>(await api.get('/spec/enroll_secret'));
    expect(body.spec.secrets.length).toBeGreaterThan(0);
    expect(body.spec.secrets[0].secret.length).toBeGreaterThan(5);
  });
});
