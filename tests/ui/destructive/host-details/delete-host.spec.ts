import { test, expect } from '../../../../src/fixtures';
import { isLinux, pickLinuxHost } from '../../../../src/utils/hostPicker';

/**
 * Action: cancel Delete, then confirm Delete, on a spare Linux host.
 * Checks: cancel leaves the host in place, and confirm removes that id. This describe is @destructive, so it runs after the read-only UI suite.
 * Why: Delete is the destructive control on host details. Fleet cannot restore that same id.
 */
test.describe('Host details – delete host @destructive', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  /**
   * Action: open Delete on a spare online Linux host, cancel, then open Delete again and confirm. This host is not the one the read-only tests use. Retries are off.
   * Checks: after cancel the modal closes and GET /hosts/:id is still 200. After confirm the success toast names the host, the URL is /hosts/manage, and GET /hosts/:id is 404. A later re-enroll is a new id, so this only asserts the deleted id is gone.
   * Why: cancel must be safe, and confirm must actually delete.
   */
  test('cancel keeps host; confirm deletes it (API oracle)', { tag: '@destructive' }, async ({ hostDetailsPage, api, page }) => {
    const hosts = await api.listAllHosts();
    const readOnly = pickLinuxHost(hosts);
    const spare = hosts
      .filter((h) => isLinux(h) && h.status === 'online' && h.id !== readOnly.id)
      .sort((a, b) => a.id - b.id);
    expect(spare.length, 'need an online Linux host besides the read-only host').toBeGreaterThan(0);
    const victim = spare[spare.length - 1];

    await hostDetailsPage.goto(victim.id);

    await hostDetailsPage.openAction('Delete');
    await hostDetailsPage.deleteModal.expectOpen();
    await hostDetailsPage.deleteModal.cancel.click();
    await hostDetailsPage.deleteModal.expectClosed();
    expect(await api.getHostStatusCode(victim.id)).toBe(200);

    await hostDetailsPage.openAction('Delete');
    await hostDetailsPage.deleteModal.confirm.click();
    await hostDetailsPage.expectSuccessToast(`Host "${victim.display_name}" was successfully deleted.`);
    await expect(page).toHaveURL(/\/hosts\/manage/);

    // Preview agents re-enroll (possibly with a new id) — assert only that this id is gone now.
    expect(await api.getHostStatusCode(victim.id)).toBe(404);
  });
});
