import { test, expect } from '../../../../src/fixtures';

/**
 * Action: select hosts on the page and open Delete without confirming.
 * Checks: one row selects and unselects, the header checkbox selects every visible row, the banner states the count, and Cancel and Escape close Delete while GET /hosts/:id stays 200. Run script is not clicked.
 * Why: the bulk bar is the other Delete entry. Confirming it cannot be undone.
 */
test.describe('Hosts page – row selection', () => {
  /**
   * Action: check the simulated Linux host, uncheck it, then use the header checkbox and Clear selection.
   * Checks: the row checkbox reports aria-checked, Delete is visible only while a row is selected, the header checkbox checks every visible row, and Clear selection unchecks them. Run script is not clicked.
   * Why: the selection banner covers the column checkbox, so Clear selection is the control that drops the selection.
   */
  test(
    'row and header checkboxes select only the visible hosts',
    { tag: '@regression' },
    async ({ hostsPage, linuxHost, page }) => {
      await hostsPage.goto();
      await expect(hostsPage.bulkDeleteButton).toHaveCount(0);

      const row = hostsPage.rowCheckbox(linuxHost.display_name);
      await row.click();
      await expect(row).toHaveAttribute('aria-checked', 'true');
      await expect(hostsPage.bulkDeleteButton).toBeVisible();

      await row.click();
      await expect(row).toHaveAttribute('aria-checked', 'false');
      await expect(hostsPage.bulkDeleteButton).toHaveCount(0);

      await hostsPage.headerCheckbox.click();
      const boxes = hostsPage.rowCheckboxes();
      const n = await boxes.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) await expect(boxes.nth(i)).toHaveAttribute('aria-checked', 'true');

      await hostsPage.clearSelectionButton.click();
      await expect(boxes.first()).toHaveAttribute('aria-checked', 'false');
      await expect(hostsPage.bulkDeleteButton).toHaveCount(0);
      await expect(page).toHaveURL(/\/hosts\/manage/);
    },
  );

  /**
   * Action: select one host, then select every host on the page. Do not click Run script.
   * Checks: one row sets the header checkbox to mixed and shows "1 selected". Selecting the page shows that count and "All hosts on this page are selected". Run script is enabled.
   * Why: the banner is how an operator sees what Delete would apply to. Run script leaves this page.
   */
  test(
    'selection banner counts the hosts and leaves Run script alone',
    { tag: '@regression' },
    async ({ hostsPage, linuxHost, page }) => {
      await hostsPage.goto();
      await hostsPage.rowCheckbox(linuxHost.display_name).click();
      await expect(hostsPage.headerCheckbox).toHaveAttribute('aria-checked', 'mixed');
      const banner = hostsPage.selectionBanner();
      await expect(banner).toContainText('1 selected');
      await expect(hostsPage.runScriptButton).toBeEnabled();

      await hostsPage.clearSelectionButton.click();
      await hostsPage.headerCheckbox.click();
      const n = await hostsPage.rowCheckboxes().count();
      await expect(banner).toContainText(`${n} selected`);
      await expect(banner).toContainText('All hosts on this page are selected');
      await expect(hostsPage.runScriptButton).toBeEnabled();
      await expect(page).toHaveURL(/\/hosts\/manage/);
    },
  );

  /**
   * Action: select the simulated Linux host, open Delete, click Cancel, open Delete again, and press Escape.
   * Checks: the modal opens both times, closes both times, and GET /hosts/:id is still 200.
   * Why: both dismissals have to leave the host in the fleet.
   */
  test(
    'Delete Cancel and Escape leave the host in place',
    { tag: '@regression' },
    async ({ hostsPage, api, linuxHost, page }) => {
      await hostsPage.goto();
      await hostsPage.rowCheckbox(linuxHost.display_name).click();
      await hostsPage.bulkDeleteButton.click();
      await hostsPage.deleteModal.expectOpen();
      await hostsPage.deleteModal.cancel.click();
      await hostsPage.deleteModal.expectClosed();
      expect(await api.getHostStatusCode(linuxHost.id)).toBe(200);

      await hostsPage.bulkDeleteButton.click();
      await hostsPage.deleteModal.expectOpen();
      await page.keyboard.press('Escape');
      await hostsPage.deleteModal.expectClosed();
      expect(await api.getHostStatusCode(linuxHost.id)).toBe(200);
    },
  );
});
