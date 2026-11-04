import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE, env } from '../../../src/config/env';
import { LoginPage } from '../../../src/pages/LoginPage';

/** Log in once through the real UI; persist the `token` cookie for all tests. */
setup('authenticate as admin', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(env.email, env.password);
  await expect(page).toHaveURL(/\/(dashboard|hosts)/);
  const cookies = await page.context().cookies();
  expect(
    cookies.some((c) => c.name === 'token' || c.name === '__Host-token'),
    'auth cookie set',
  ).toBeTruthy();
  await page.context().storageState({ path: STORAGE_STATE });
});
