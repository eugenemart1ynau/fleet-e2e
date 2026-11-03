import { test, expect } from '../../src/fixtures';
import { pickLinuxHost } from '../../src/utils/hostPicker';

test.describe('Host details – delete host @destructive', () => {
  test.describe.configure({ mode: 'serial' });

  test('cancel keeps host; confirm deletes it (API oracle)', async ({ hostDetailsPage, api, page }) => {
    // Use the *last* Linux host so read-only tests (which use the first) are unaffected.
    const hosts = await api.listHosts();
    const linux = hosts.filter((h) => h.platform !== 'darwin' && h.status === 'online');
    const victim = linux.length > 1 ? linux[linux.length - 1] : pickLinuxHost(hosts);

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
