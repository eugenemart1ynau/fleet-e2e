import { test, expect } from '../../src/fixtures/api';
import { expectStatus } from '../../src/api/assertions';
import { pickLinuxHost } from '../../src/utils/hostPicker';

/**
 * Mutating API checks. Runs only in the `api-destructive` project (npm run test:api:destructive),
 * never in `npm run test:api`. Preview agents re-enroll after delete (often with a new id),
 * so we only assert that the deleted id is gone immediately.
 */
test.describe('API: DELETE /hosts/:id @api @destructive', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('delete returns 200, host then 404, second delete 404', async ({ api, allHosts }) => {
    // Avoid the first Linux host (read-only suites) and the last one (UI delete spec).
    const readOnly = pickLinuxHost(allHosts);
    const linux = allHosts.filter((h) => h.platform !== 'darwin' && h.status === 'online' && h.id !== readOnly.id);
    test.skip(linux.length < 2, 'need at least 3 online Linux hosts to delete one safely');
    const victim = linux[linux.length - 2];

    await expectStatus(await api.delete(`/hosts/${victim.id}`), 200);
    expect(await api.getHostStatusCode(victim.id)).toBe(404);
    expect((await api.listHosts({ query: victim.uuid })).map((h) => h.id)).not.toContain(victim.id);
    await expectStatus(await api.delete(`/hosts/${victim.id}`), 404);
  });
});
