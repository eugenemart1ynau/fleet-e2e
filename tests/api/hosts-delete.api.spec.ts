import { test, expect } from '../../src/fixtures/api';
import { expectFleetError, expectStatus } from '../../src/api/assertions';
import type { Host } from '../../src/api/types';
import { missingHostId, NO_MATCH_HOST_QUERY } from '../../src/utils/apiData';
import { isLinux, pickLinuxHost } from '../../src/utils/hostPicker';

/**
 * Authenticated delete coverage. The describe is test.describe.fixme, so these
 * bodies do not call the API. Fleet has no undelete. A preview agent that
 * re-enrolls later is a new host id, not the one these calls would remove.
 * Do not remove `.fixme` from the describe.
 * `filters: {}` is intentionally absent: on this API it deletes every host.
 */

/** Second spare online Linux host, never the read-only host the rest of the suite uses. */
function spareLinuxHost(allHosts: Host[]): Host {
  const readOnly = pickLinuxHost(allHosts);
  const spare = allHosts.filter((h) => isLinux(h) && h.status === 'online' && h.id !== readOnly.id);
  test.skip(spare.length < 2, 'need at least 3 online Linux hosts to delete one safely');
  return spare[spare.length - 2];
}

/**
 * Call: DELETE /hosts/:id and POST /hosts/delete.
 * Checks: written on each test below. test.describe.fixme means none of these bodies run. See the note at the top of this file. filters: {} is not sent, because that body deletes every host.
 * Why: Hosts bulk delete and the host-details Delete control. Fleet cannot restore the same host id.
 */
test.describe.fixme('API: authenticated host delete @api @destructive', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  /**
   * Call: DELETE /hosts/:id on a spare Linux host, then GET that id, then DELETE again. This body does not run.
   * Checks: first delete is 200, GET is 404, a uuid search no longer lists the id, and the second delete is 404.
   * Why: the details Delete control, including a repeat click after the host is gone.
   */
  test('DELETE /hosts/:id returns 200, then 404, then a second delete is 404', { tag: '@destructive' }, async ({ api, allHosts }) => {
    const victim = spareLinuxHost(allHosts);

    await expectStatus(await api.delete(`/hosts/${victim.id}`), 200);
    expect(await api.getHostStatusCode(victim.id)).toBe(404);
    expect((await api.listHosts({ query: victim.uuid })).map((h) => h.id)).not.toContain(victim.id);
    await expectStatus(await api.delete(`/hosts/${victim.id}`), 404);
  });

  /**
   * Call: POST /hosts/delete with one spare id, then the same id again. This body does not run.
   * Checks: 200, GET is 404, the count drops by one, and a second post stays 200 without dropping the count again.
   * Why: bulk delete of one selected host, and repeating it.
   */
  test('POST /hosts/delete with one id removes only that host', { tag: '@destructive' }, async ({ api, allHosts }) => {
    const victim = spareLinuxHost(allHosts);
    const before = await api.countHosts();

    await expectStatus(await api.post('/hosts/delete', { data: { ids: [victim.id] } }), 200);
    expect(await api.getHostStatusCode(victim.id)).toBe(404);
    expect(await api.countHosts()).toBe(before - 1);
    await expectStatus(await api.post('/hosts/delete', { data: { ids: [victim.id] } }), 200);
    expect(await api.countHosts()).toBe(before - 1);
  });

  /**
   * Call: POST /hosts/delete with an empty object. This body does not run.
   * Checks: 400, and the host count is unchanged.
   * Why: an empty bulk-delete body must not remove hosts.
   */
  test('POST /hosts/delete with an empty body is 400 and deletes nothing', { tag: '@destructive' }, async ({ api }) => {
    const before = await api.countHosts();
    await expectFleetError(await api.post('/hosts/delete', { data: {} }), 400);
    expect(await api.countHosts()).toBe(before);
  });

  /**
   * Call: POST /hosts/delete with both ids and filters. This body does not run.
   * Checks: 400, the known host is still 200, and the count is unchanged.
   * Why: Fleet rejects a body that mixes the two selectors.
   */
  test('POST /hosts/delete with both ids and filters is 400 and deletes nothing', { tag: '@destructive' }, async ({ api, knownHost }) => {
    const before = await api.countHosts();
    await expectFleetError(
      await api.post('/hosts/delete', { data: { ids: [knownHost.id], filters: { query: knownHost.uuid } } }),
      400,
    );
    expect(await api.getHostStatusCode(knownHost.id)).toBe(200);
    expect(await api.countHosts()).toBe(before);
  });

  /**
   * Call: POST /hosts/delete with ids set to an empty list. This body does not run.
   * Checks: 400, and the host count is unchanged.
   * Why: an empty selection must not delete the fleet.
   */
  test('POST /hosts/delete with an empty ids list is 400 and deletes nothing', { tag: '@destructive' }, async ({ api }) => {
    const before = await api.countHosts();
    await expectFleetError(await api.post('/hosts/delete', { data: { ids: [] } }), 400);
    expect(await api.countHosts()).toBe(before);
  });

  /**
   * Call: POST /hosts/delete with an id that is not in the list. This body does not run.
   * Checks: the known host is still 200 and the count is unchanged.
   * Why: an unknown id must not remove a real host.
   */
  test('POST /hosts/delete with an unknown id does not remove a real host', { tag: '@destructive' }, async ({ api, allHosts, knownHost }) => {
    const before = await api.countHosts();
    await api.post('/hosts/delete', { data: { ids: [missingHostId(allHosts)] } });
    expect(await api.getHostStatusCode(knownHost.id)).toBe(200);
    expect(await api.countHosts()).toBe(before);
  });

  /**
   * Call: POST /hosts/delete with filters.query set to a string that matches no host. This body does not run.
   * Checks: 200, the known host is still 200, and the count is unchanged. This is not filters: {}, which would delete every host.
   * Why: a filter that matches nothing must not delete a host.
   */
  test('POST /hosts/delete with a no-match query filter does not remove a host', { tag: '@destructive' }, async ({ api, knownHost }) => {
    const before = await api.countHosts();
    await expectStatus(
      await api.post('/hosts/delete', { data: { filters: { query: NO_MATCH_HOST_QUERY } } }),
      200,
    );
    expect(await api.getHostStatusCode(knownHost.id)).toBe(200);
    expect(await api.countHosts()).toBe(before);
  });
});
