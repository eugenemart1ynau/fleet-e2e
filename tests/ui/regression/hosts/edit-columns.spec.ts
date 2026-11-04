import { test, expect } from '../../../../src/fixtures';
import { withHostColumnLock } from '../../../../src/utils/columnLock';

/**
 * Action: dismiss Edit columns without saving, and show a column that starts hidden.
 * Checks: Cancel and Escape leave the table and hidden_host_columns unchanged. Showing Hostname persists until the previous setting is restored. The Host checkbox is disabled.
 * Why: Edit columns writes a user setting, so a dismiss must not hide a column by accident.
 */
test.describe('Hosts page – edit columns', () => {
  /**
   * Action: open Edit columns, toggle Hardware model, and click Cancel.
   * Checks: the modal closes, the hardware_model header is still visible, and hidden_host_columns is still empty.
   * Why: Cancel must throw away the toggle.
   */
  test('Cancel discards a column toggle', { tag: '@regression' }, async ({ hostsPage, api }) => {
    await withHostColumnLock(async () => {
      const before = await api.getHiddenHostColumns();
      try {
        await api.setHiddenHostColumns([]);
        await hostsPage.goto();
        const modal = await hostsPage.openEditColumns();
        await modal.getByText('Hardware model', { exact: true }).click();
        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).toBeHidden();
        await expect(hostsPage.columnHeader('hardware_model')).toBeVisible();
        expect(await api.getHiddenHostColumns()).toEqual([]);
      } finally {
        await api.setHiddenHostColumns(before.length ? before : []);
      }
    });
  });

  /**
   * Action: open Edit columns, toggle Hardware model, and press Escape.
   * Checks: the modal closes, the hardware_model header is still visible, and hidden_host_columns is still empty.
   * Why: Escape is the other way out of the modal without saving.
   */
  test('Escape discards a column toggle', { tag: '@regression' }, async ({ hostsPage, api, page }) => {
    await withHostColumnLock(async () => {
      const before = await api.getHiddenHostColumns();
      try {
        await api.setHiddenHostColumns([]);
        await hostsPage.goto();
        const modal = await hostsPage.openEditColumns();
        await modal.getByText('Hardware model', { exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
        await expect(hostsPage.columnHeader('hardware_model')).toBeVisible();
        expect(await api.getHiddenHostColumns()).toEqual([]);
      } finally {
        await api.setHiddenHostColumns(before.length ? before : []);
      }
    });
  });

  /**
   * Action: hide Hostname, reload, then show it again from Edit columns.
   * Checks: the hostname header is absent while hidden, visible after save, and hidden_host_columns no longer lists it. The previous setting is restored.
   * Why: showing a column is the reverse of the smoke hide, and it has to persist the same way.
   */
  test('showing Hostname persists until the setting is restored', { tag: '@regression' }, async ({ hostsPage, api }) => {
    await withHostColumnLock(async () => {
      const before = await api.getHiddenHostColumns();
      try {
        await api.setHiddenHostColumns(['hostname']);
        await hostsPage.goto();
        await expect(hostsPage.columnHeader('hostname')).toHaveCount(0);
        await hostsPage.toggleColumnAndSave('Hostname');
        await expect(hostsPage.columnHeader('hostname')).toBeVisible();
        expect(await api.getHiddenHostColumns()).not.toContain('hostname');
      } finally {
        await api.setHiddenHostColumns(before.length ? before : []);
      }
    });
  });

  /**
   * Action: open Edit columns.
   * Checks: the modal has no Host checkbox. Hostname is listed.
   * Why: Host is the row's link. Fleet leaves it out of Edit columns, so it cannot be hidden.
   */
  test('Host column cannot be hidden', { tag: '@regression' }, async ({ hostsPage }) => {
    await hostsPage.goto();
    const modal = await hostsPage.openEditColumns();
    await expect(modal.getByRole('checkbox', { name: 'Host', exact: true })).toHaveCount(0);
    await expect(modal.getByRole('checkbox', { name: 'Hostname', exact: true })).toBeVisible();
  });
});
