import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly email = this.page.getByPlaceholder('Email');
  readonly password = this.page.getByPlaceholder('Password');
  readonly submit = this.page.getByRole('button', { name: 'Log in' });

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    // Three browsers log in together after setup. Fleet answers 429 and stacks
    // "limit exceeded, retry after: Ns" toasts, so wait out the longest one.
    const toasts = this.page
      .locator('.toast-notification__message')
      .filter({ hasText: /limit exceeded, retry after:/i });
    for (let attempt = 1; attempt <= 8; attempt++) {
      if (!this.page.url().includes('/login')) {
        await this.leaveLogin();
        return;
      }
      await this.waitOutLimit(toasts, attempt);
      await this.submit.click();
      const outcome = await Promise.race([
        this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 }).then(() => 'ok' as const),
        toasts
          .first()
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => 'limited' as const),
      ]).catch(() => 'stuck' as const);
      if (outcome === 'ok' || !this.page.url().includes('/login')) {
        await this.leaveLogin();
        return;
      }
      const navigated = await this.page
        .waitForURL((url) => !url.pathname.includes('/login'), { timeout: 2_000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) {
        await this.leaveLogin();
        return;
      }
      if (attempt === 8) break;
    }
    await expect(this.page).not.toHaveURL(/\/login/);
    await this.leaveLogin();
  }

  /** Fleet sends /login to /dashboard after the form accepts. Wait until that navigation finishes. */
  private async leaveLogin(): Promise<void> {
    await this.page.waitForURL(/\/(dashboard|hosts)(\/|$|\?)/, { timeout: 20_000 });
    await this.page.waitForLoadState('load');
  }

  private async waitOutLimit(toasts: Locator, attempt: number): Promise<void> {
    const count = await toasts.count();
    if (count === 0) return;
    let seconds = 1;
    for (let i = 0; i < count; i++) {
      const wait = /retry after: (\d+(?:\.\d+)?)s/.exec(await toasts.nth(i).innerText());
      if (wait) seconds = Math.max(seconds, Number(wait[1]));
    }
    await this.page.waitForTimeout(seconds * 1000 + 250 * attempt);
  }
}
