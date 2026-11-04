import { Locator, Page, expect } from '@playwright/test';

/**
 * Shared by bulk delete (Hosts page) and single delete (Host details).
 * Fleet modals have no role="dialog"; scope by the modal container.
 */
export class DeleteHostModal {
  readonly root: Locator;
  readonly confirm: Locator;
  readonly cancel: Locator;

  constructor(private readonly page: Page) {
    this.root = page
      .locator('.modal__modal_container')
      .filter({ has: page.locator('.modal__header', { hasText: 'Delete' }) });
    this.confirm = this.root.getByRole('button', { name: 'Delete', exact: true });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
  }

  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.root).toContainText(/re-enroll unless Fleet's agent is uninstalled/);
  }

  async expectClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }
}
