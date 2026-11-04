import { Locator, Page, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Toasts render with role="alert" (class toast-notification__card--success|error). */
  get toast(): Locator {
    return this.page.locator('[role="alert"]');
  }

  async expectSuccessToast(text: string | RegExp): Promise<void> {
    await expect(
      this.page.locator('.toast-notification__card--success, [role="alert"]').filter({ hasText: text }),
    ).toBeVisible();
  }

  async expectNoErrorToast(): Promise<void> {
    await expect(this.page.locator('.toast-notification__card--error')).toHaveCount(0);
  }
}
