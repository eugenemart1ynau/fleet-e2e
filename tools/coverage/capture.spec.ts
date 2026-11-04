import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { expect, test, type Cookie, type Locator, type Page } from '@playwright/test';
import { STORAGE_STATE } from '../../src/config/env';
import { FleetApiClient } from '../../src/api/FleetApiClient';
import type { EnrollSecretSpec } from '../../src/api/types';
import { HostDetailsPage } from '../../src/pages/HostDetailsPage';
import { HostsPage } from '../../src/pages/HostsPage';
import { pickLinuxHost } from '../../src/utils/hostPicker';
import { missingHostId } from '../../src/utils/apiData';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface ScreenDef {
  id: string;
  file: string;
  fullPage: boolean;
}
interface HotspotDef {
  id: string;
  screenId: string;
  anchor: string;
}

const repoRoot = process.cwd();
const nextDir = path.join(repoRoot, 'coverage-dashboard', 'screens-next');

function atlas(): { screens: ScreenDef[]; hotspots: HotspotDef[] } {
  const raw = execFileSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--disable-warning=ExperimentalWarning',
      'tools/coverage/dump-atlas.ts',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );
  return JSON.parse(raw);
}

test('capture masked Fleet screens for the coverage atlas', async ({ page }) => {
  test.setTimeout(180_000);
  const { screens, hotspots } = atlas();
  fs.rmSync(nextDir, { recursive: true, force: true });
  fs.mkdirSync(nextDir, { recursive: true });

  const api = await FleetApiClient.login();
  const secrets = ((await (await api.get('/spec/enroll_secret')).json()) as EnrollSecretSpec).spec.secrets
    .map((item) => item.secret)
    .filter((secret) => secret.length > 5);
  const linux = pickLinuxHost(await api.listHosts());
  const missingId = missingHostId(await api.listHosts());
  const hosts = new HostsPage(page);
  const details = new HostDetailsPage(page);
  const session = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf8')) as {
    cookies: Cookie[];
    origins?: { origin: string; localStorage: { name: string; value: string }[] }[];
  };
  const masked = new Set<string>();

  const order = [
    ...screens.filter((screen) => screen.id !== 'account-menu' && screen.id !== 'signed-out'),
    ...screens.filter((screen) => screen.id === 'account-menu' || screen.id === 'signed-out'),
  ];

  try {
    const shots: Record<string, { file: string; boxes: Record<string, Box | null> }> = {};
    for (const screen of order) {
      await openScreen(screen.id);
      if ((screen.id === 'hosts-add' || screen.id === 'hosts-enroll') && !masked.has(screen.id)) {
        throw new Error(`Refusing to photograph ${screen.id}: the enroll secret was not masked`);
      }
      const boxes: Record<string, Box | null> = {};
      for (const hot of hotspots.filter((item) => item.screenId === screen.id)) {
        boxes[hot.id] = await measure(anchor(page, hot.anchor), screen.fullPage);
      }
      const file = path.join(nextDir, screen.file);
      await page.screenshot({ path: file, fullPage: screen.fullPage, animations: 'disabled' });
      if (screen.id === 'hosts-add' || screen.id === 'hosts-enroll') assertPngHasNoSecret(file, secrets);
      if (screen.id === 'login') {
        await page.context().addCookies(session.cookies);
        await page.evaluate((origins) => {
          const here = origins.find((item) => item.origin === location.origin);
          for (const item of here?.localStorage ?? []) localStorage.setItem(item.name, item.value);
        }, session.origins ?? []);
      }
      shots[screen.id] = { file: screen.file, boxes };
      await disarm(page);
    }

    fs.writeFileSync(
      path.join(nextDir, 'boxes.json'),
      JSON.stringify({ capturedAt: new Date().toISOString(), screens: shots }, null, 2),
    );
    const finalDir = path.join(repoRoot, 'coverage-dashboard', 'screens');
    fs.rmSync(finalDir, { recursive: true, force: true });
    fs.renameSync(nextDir, finalDir);
  } finally {
    await api.dispose();
  }

  async function openScreen(id: string): Promise<void> {
    switch (id) {
      case 'login':
        await page.context().clearCookies();
        await page.goto('/login');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.goto('/login');
        await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
        return;
      case 'hosts-default':
        await hosts.goto();
        return;
      case 'hosts-status-open':
        await hosts.goto();
        await hosts.statusFilter.focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('[id*="-option-"]').first()).toBeVisible();
        return;
      case 'hosts-label-open':
        await hosts.goto();
        await hosts.labelFilter.click();
        await expect(page.locator('.label-filter-select__menu')).toBeVisible();
        return;
      case 'hosts-empty':
        await hosts.goto();
        await hosts.searchFor('zz-no-such-host-e2e');
        await expect(hosts.emptyState).toBeVisible();
        return;
      case 'hosts-columns':
        await hosts.goto();
        await hosts.openEditColumns();
        return;
      case 'hosts-add':
        await hosts.goto();
        await hosts.openAddHosts();
        await maskSecrets(page, secrets);
        masked.add(id);
        return;
      case 'hosts-settings':
        await hosts.goto();
        await page.getByRole('button', { name: 'Hosts page settings' }).click();
        await expect(page.locator('.actions-dropdown-select__menu')).toBeVisible();
        return;
      case 'hosts-enroll':
        await hosts.goto();
        await page.getByRole('button', { name: 'Hosts page settings' }).click();
        await page.locator('.actions-dropdown-select__menu').getByText('Enroll secrets', { exact: true }).click();
        await expect(
          page.locator('.modal__modal_container').filter({ hasText: 'Manage enroll secrets' }),
        ).toBeVisible();
        await maskSecrets(page, secrets);
        masked.add(id);
        return;
      case 'hosts-selected':
        await hosts.goto();
        await hosts.rowCheckbox(linux.display_name).click();
        await expect(page.locator('thead.active-selection')).toBeVisible();
        return;
      case 'hosts-linux':
        await hosts.goto();
        await hosts.filterByPlatformOrLabel('Linux');
        return;
      case 'hosts-unknown-label':
        await page.goto('/hosts/manage/labels/999999999');
        await expect(hosts.heading.or(page.getByText(/can't find that page/i))).toBeVisible();
        return;
      case 'hosts-bad-status':
        await page.goto('/hosts/manage?status=not-a-status');
        await expect(hosts.heading).toBeVisible();
        return;
      case 'details-overview':
        await details.goto(linux.id);
        return;
      case 'details-software':
        await details.goto(linux.id, 'software');
        return;
      case 'details-policies':
        await details.goto(linux.id);
        await details.openTab('Policies');
        await expect(details.policiesEmptyCopy()).toBeVisible();
        return;
      case 'details-reports':
        await details.goto(linux.id);
        await details.openTab('Reports');
        await expect(details.reportsEmptyCopy()).toBeVisible();
        return;
      case 'details-actions':
        await details.goto(linux.id);
        await details.actionsDropdown.click();
        await expect(details.actionOption('Delete')).toBeVisible();
        return;
      case 'details-delete':
        await details.goto(linux.id);
        await details.openAction('Delete');
        await details.deleteModal.expectOpen();
        return;
      case 'details-404':
        await details.pageGoto(`/hosts/${missingId}/details`);
        await details.expectFleetNotFound();
        return;
      case 'details-abc':
        await details.pageGoto('/hosts/abc/details');
        await details.expectNoHost();
        return;
      case 'details-zero':
        await details.pageGoto('/hosts/0/details');
        await details.expectNoHost();
        return;
      case 'account-menu':
        await hosts.goto();
        await page.getByTestId('user-menu').getByRole('combobox').focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('[id*="-option-"]').filter({ hasText: /^Sign out$/ })).toBeVisible();
        return;
      case 'signed-out':
        await hosts.goto();
        await page.getByTestId('user-menu').getByRole('combobox').focus();
        await page.keyboard.press('ArrowDown');
        await page
          .locator('[id*="-option-"]')
          .filter({ hasText: /^Sign out$/ })
          .click();
        await expect(page).toHaveURL(/\/login/);
        await page.goto('/hosts/manage');
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
        return;
      default:
        throw new Error(`No capture setup for ${id}`);
    }
  }
});

function anchor(target: Page, key: string): Locator {
  const hosts = new HostsPage(target);
  const details = new HostDetailsPage(target);
  switch (key) {
    case 'loginSubmit':
      return target.getByRole('button', { name: 'Log in' });
    case 'signOut':
      return target.locator('[id*="-option-"]').filter({ hasText: /^Sign out$/ });
    case 'accountMenu':
      return target.locator('[class*="menu"]').filter({ hasText: 'Sign out' }).last();
    case 'heading':
      return hosts.heading;
    case 'count':
      return hosts.count;
    case 'search':
      return hosts.search;
    case 'status':
      return hosts.statusFilter;
    case 'statusMenu':
      return target.locator('[class*="menu"]').filter({ hasText: 'Online hosts' }).last();
    case 'label':
      return hosts.labelFilter;
    case 'labelMenu':
      return target.locator('.label-filter-select__menu');
    case 'addLabel':
      return target.getByRole('button', { name: 'Add label' });
    case 'sort':
      return hosts.columnHeaderButton('Operating system');
    case 'export':
      return hosts.exportButton;
    case 'columnsBtn':
      return hosts.editColumnsButton;
    case 'addBtn':
      return hosts.addHostsButton;
    case 'hostLink':
      return hosts.hostLinks.first();
    case 'row':
      return hosts.rows.first();
    case 'headerCheck':
      return hosts.headerCheckbox;
    case 'settings':
      return target.getByRole('button', { name: 'Hosts page settings' });
    case 'empty':
      return hosts.emptyState;
    case 'emptyAdd':
      return hosts.emptyState.getByRole('button', { name: 'Add hosts' });
    case 'columnsModal':
      return hosts.editColumnsModal();
    case 'addModal':
      return hosts.addHostsModal();
    case 'addSettings':
      return hosts.addHostsModal().getByRole('link').first();
    case 'settingsMenu':
      return target.locator('.actions-dropdown-select__menu');
    case 'activity':
      return target.locator('.actions-dropdown-select__option', { hasText: 'Activity automations' });
    case 'customVitals':
      return target.locator('.actions-dropdown-select__menu').getByText('Custom host vitals');
    case 'enrollModal':
      return target.locator('.modal__modal_container').filter({ hasText: 'Manage enroll secrets' });
    case 'addSecret':
      return target
        .locator('.modal__modal_container')
        .filter({ hasText: 'Manage enroll secrets' })
        .getByRole('button', { name: /add secret/i });
    case 'selection':
      return target.locator('thead.active-selection');
    case 'runScript':
      return target.getByRole('button', { name: 'Run script' });
    case 'editLabel':
      return target.getByRole('link', { name: /edit label/i }).or(target.getByRole('button', { name: /edit label/i }));
    case 'pageMain':
      return hosts.heading.or(target.getByRole('heading').first());
    case 'displayName':
      return details.displayName;
    case 'back':
      return details.backButton;
    case 'refetch':
      return details.refetchButton;
    case 'actions':
      return details.actionsDropdown;
    case 'tabs':
      return target.getByRole('tablist');
    case 'vitals':
      return target.getByText('Vitals', { exact: true });
    case 'side':
      return details.activityHeading;
    case 'agent':
      return target.getByText('Agent options', { exact: true });
    case 'softwareSearch':
      return details.softwareSearch;
    case 'softwareLink':
      return details.softwareTitleLinks().first();
    case 'policiesPanel':
      return target.locator('h3').filter({ hasText: 'No policies checked' });
    case 'reportsPanel':
      return details.reportsEmptyCopy();
    case 'actionsDelete':
      return details.actionOption('Delete');
    case 'actionsMenu':
      return target
        .locator('[class*="dropdown"]')
        .filter({ has: target.getByTestId('dropdown-option') })
        .last();
    case 'deleteCancel':
      return details.deleteModal.cancel;
    case 'deleteConfirm':
      return details.deleteModal.confirm;
    case 'notFound':
      return details.notFoundCopy().or(details.loadingIndicator());
    default:
      throw new Error(`Unknown capture anchor: ${key}`);
  }
}

async function measure(locator: Locator, fullPage: boolean): Promise<Box | null> {
  const count = Math.min(await locator.count(), 8);
  for (let i = 0; i < count; i += 1) {
    const target = locator.nth(i);
    // Protocol box. getBoundingClientRect inside evaluate is 0 for some Fleet headings
    // in the same moment this box is real, so the overlay uses this.
    const raw = await target.boundingBox();
    if (!raw) continue;
    let left = raw.x;
    let top = raw.y;
    let width = raw.width;
    let height = raw.height;
    if (width < 8 || height < 8) {
      const grown = await target.evaluate((node) => {
        let el = node as HTMLElement;
        let box = el.getBoundingClientRect();
        for (let n = 0; n < 6 && (box.width < 8 || box.height < 8) && el.parentElement; n += 1) {
          el = el.parentElement;
          box = el.getBoundingClientRect();
        }
        return { x: box.x, y: box.y, w: box.width, h: box.height };
      });
      if (grown.w >= 8 && grown.h >= 8) {
        left = grown.x;
        top = grown.y;
        width = grown.w;
        height = grown.h;
      }
    }
    if (width < 2 || height < 2) continue;
    const frame = await target.evaluate(
      (_node, pageShot) => ({
        scrollX: pageShot ? window.scrollX : 0,
        scrollY: pageShot ? window.scrollY : 0,
        shotW: window.innerWidth,
        shotH: pageShot
          ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)
          : window.innerHeight,
      }),
      fullPage,
    );
    const absX = left + frame.scrollX;
    const absY = top + frame.scrollY;
    const x = Math.max(0, absX);
    const y = Math.max(0, absY);
    const w = Math.min(absX + width, frame.shotW) - x;
    const h = Math.min(absY + height, frame.shotH) - y;
    if (w < 2 || h < 2 || frame.shotW < 2 || frame.shotH < 2) continue;
    return {
      x: (x / frame.shotW) * 100,
      y: (y / frame.shotH) * 100,
      w: (w / frame.shotW) * 100,
      h: (h / frame.shotH) * 100,
    };
  }
  return null;
}

async function maskSecrets(target: Page, secrets: string[]): Promise<void> {
  if (!secrets.length) throw new Error('Refusing to photograph enroll UI: no secret was returned to mask');
  const still = await target.evaluate((list) => {
    const read = () =>
      `${document.body.innerText}\n${[...document.querySelectorAll('input, textarea')]
        .map((el) => (el as HTMLInputElement).value)
        .join('\n')}`;
    if (!list.some((secret) => read().includes(secret))) return -1;
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }
    for (const textNode of nodes) {
      let text = textNode.textContent ?? '';
      for (const secret of list) if (text.includes(secret)) text = text.split(secret).join('••••••••');
      textNode.textContent = text;
    }
    for (const el of document.querySelectorAll('input, textarea')) {
      const input = el as HTMLInputElement;
      for (const secret of list)
        if (input.value.includes(secret)) input.value = input.value.split(secret).join('••••••••');
    }
    for (const el of document.querySelectorAll('*')) {
      for (const attr of [...el.attributes]) {
        if (list.some((secret) => attr.value.includes(secret))) el.setAttribute(attr.name, '••••••••');
      }
    }
    return list.filter((secret) => read().includes(secret)).length;
  }, secrets);
  if (still === -1) throw new Error('Refusing to photograph enroll UI: the secret was not in the dialog to mask');
  if (still > 0) throw new Error('Refusing to photograph enroll UI: the secret was still in the DOM after masking');
}

function assertPngHasNoSecret(file: string, secrets: string[]): void {
  const bytes = fs.readFileSync(file);
  for (const secret of secrets) {
    if (secret.length > 5 && bytes.includes(Buffer.from(secret))) {
      fs.rmSync(file, { force: true });
      throw new Error('Refusing to keep a screenshot: the enroll secret was still in the image file');
    }
  }
}

async function disarm(target: Page): Promise<void> {
  const modal = target
    .locator('.modal__modal_container')
    .filter({ has: target.locator('.modal__header', { hasText: 'Delete' }) });
  if (
    (await modal.count()) > 0 &&
    (await modal
      .first()
      .isVisible()
      .catch(() => false))
  ) {
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();
  }
  const clear = target.getByRole('button', { name: 'Clear selection' });
  if (
    (await clear.count()) > 0 &&
    (await clear
      .first()
      .isVisible()
      .catch(() => false))
  )
    await clear.first().click();
  await target.keyboard.press('Escape').catch(() => undefined);
}
