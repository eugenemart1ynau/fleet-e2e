import { Page, expect } from '@playwright/test';
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
    await this.submit.click();
    await expect(this.page).not.toHaveURL(/\/login/);
  }
}
