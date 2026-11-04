import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { DeleteHostModal } from './components/DeleteHostModal';

const exactText = (label: string): RegExp => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

/** GET /hosts for a column sort. Skips /hosts/count and /labels/:id/hosts. */
function isColumnSortResponse(url: string, orderKey?: string, previousKey?: string | null): boolean {
  try {
    const u = new URL(url);
    if (!u.pathname.endsWith('/hosts') || u.pathname.includes('/labels/')) return false;
    const key = u.searchParams.get('order_key');
    if (!key) return false;
    if (orderKey && key !== orderKey) return false;
    if (previousKey && key === previousKey) return false;
    return true;
  } catch {
    return false;
  }
}

export type StatusOption =
  'All hosts' | 'Online hosts' | 'Offline hosts' | 'Missing hosts' | 'New hosts' | 'Enrolled hosts';

/** /hosts/manage */
export class HostsPage extends BasePage {
  readonly heading: Locator;
  readonly search: Locator;
  readonly statusFilter: Locator;
  readonly labelFilter: Locator;
  readonly count: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly hostLinks: Locator;
  readonly emptyState: Locator;
  readonly addHostsButton: Locator;
  readonly exportButton: Locator;
  readonly editColumnsButton: Locator;
  /** Page-level "select every visible row" checkbox. Not "select all matching". */
  readonly headerCheckbox: Locator;
  /** react-select control. The placeholder text is gone once a platform is selected. */
  readonly labelFilterControl: Locator;
  readonly pageSettingsButton: Locator;
  readonly clearSelectionButton: Locator;
  readonly bulkDeleteButton: Locator;
  readonly runScriptButton: Locator;
  readonly deleteModal: DeleteHostModal;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Hosts' });
    this.search = page.getByPlaceholder('Search name, user email, hostname, UUID, serial number, or IP address');
    this.statusFilter = page.getByRole('combobox', { name: 'Filter by status' });
    this.labelFilter = page.getByText('Filter by platform or label');
    this.labelFilterControl = page.locator('.label-filter-select__control');
    this.pageSettingsButton = page.getByRole('button', { name: 'Hosts page settings' });
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.bulkDeleteButton = page.getByRole('button', { name: 'Delete', exact: true });
    this.runScriptButton = page.getByRole('button', { name: 'Run script' });
    this.count = page.locator('.table-count');
    this.table = page.locator('table');
    this.rows = this.table.locator('tbody tr');
    this.hostLinks = page.locator('td.display_name__cell a');
    this.emptyState = page.locator('.empty-state');
    this.addHostsButton = page.getByRole('button', { name: 'Add hosts' });
    this.exportButton = page.getByRole('button', { name: 'Export hosts' });
    this.editColumnsButton = page.getByRole('button', { name: 'Edit columns' });
    this.headerCheckbox = page.getByRole('row', { name: /^Host\b/ }).getByRole('checkbox');
    this.deleteModal = new DeleteHostModal(page);
  }

  async goto(query: Record<string, string> = {}): Promise<void> {
    const qs = new URLSearchParams(query).toString();
    const url = `/hosts/manage${qs ? `?${qs}` : ''}`;
    // Login can send the browser to /dashboard and cancel this navigation.
    // WebKit says "interrupted by another navigation". Firefox says NS_BINDING_ABORTED.
    try {
      await this.page.goto(url);
    } catch (err) {
      const message = String(err);
      const cancelled =
        message.includes('interrupted by another navigation') || message.includes('NS_BINDING_ABORTED');
      if (!cancelled) throw err;
      await this.page.goto(url);
    }
    await this.waitForLoaded();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.count.or(this.emptyState).first()).toBeVisible();
  }

  /** "N hosts" / "1 host" -> N */
  async countValue(): Promise<number> {
    const text = (await this.count.innerText()).trim();
    const m = text.match(/(\d+)\s+host/);
    if (!m) throw new Error(`Unexpected count text: "${text}"`);
    return Number(m[1]);
  }

  async expectCount(n: number): Promise<void> {
    await expect(this.count).toHaveText(new RegExp(`^\\s*${n} hosts?\\s*$`));
  }

  async hostNames(): Promise<string[]> {
    return (await this.hostLinks.allInnerTexts()).map((s) => s.trim());
  }

  hostLink(name: string): Locator {
    return this.hostLinks.filter({ hasText: name }).first();
  }

  row(name: string): Locator {
    return this.rows.filter({ has: this.page.locator('td.display_name__cell a', { hasText: name }) });
  }

  /** Row checkboxes have no accessible name; scope via the row. */
  rowCheckbox(name: string): Locator {
    return this.row(name).locator('[role="checkbox"]');
  }

  /** Every host checkbox in the table body. Not the header checkbox. */
  rowCheckboxes(): Locator {
    return this.table.locator('tbody [role="checkbox"]');
  }

  selectionBanner(): Locator {
    return this.page.locator('thead.active-selection');
  }

  columnHeaderButton(label: string): Locator {
    const pattern = exactText(label);
    const strict = this.page.locator('th button.sortable-header').filter({ hasText: pattern });
    const loose = this.page.locator('th button.sortable-header').filter({ hasText: label });
    return strict.or(loose).first();
  }

  columnHeaderCell(label: string): Locator {
    return this.page.locator('th').filter({ hasText: label }).first();
  }

  columnHeader(columnKey: string): Locator {
    return this.page.locator(`th.${columnKey}__header`);
  }

  editColumnsModal(): Locator {
    // Fleet modals use BEM `modal__modal_container` (not a `.modal` class token).
    return this.page.locator('.modal__modal_container').filter({ hasText: 'Choose which columns you see' });
  }

  addHostsModal(): Locator {
    return this.page.locator('.modal__modal_container').filter({ hasText: 'Add hosts' });
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
    // input is debounced 500ms and synced into ?query=
    if (text.trim()) {
      const query = encodeURIComponent(text.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await expect(this.page).toHaveURL(new RegExp(`query=${query}`));
    } else await expect(this.page).not.toHaveURL(/query=/);
  }

  async filterByStatus(option: StatusOption): Promise<void> {
    // react-select's combobox is a 1px dummy input; open the menu via keyboard.
    // Fleet's custom Option renders without role="option"; react-select still assigns ids "react-select-N-option-M".
    const choice = this.page
      .locator('[id*="-option-"]')
      .filter({ hasText: new RegExp(`^${option}`) })
      .first();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.statusFilter.focus();
      await this.page.keyboard.press('ArrowDown');
      try {
        await choice.click({ timeout: attempt === 0 ? 3_000 : 15_000 });
        break;
      } catch (err) {
        if (attempt === 1) throw err;
        await this.page.keyboard.press('Escape');
      }
    }
    await this.waitForLoaded();
  }

  /** react-select menu. Fleet options have no role="option". */
  labelMenu(): Locator {
    return this.page.locator('.label-filter-select__menu');
  }

  labelOption(name: string): Locator {
    return this.labelMenu()
      .locator('.label-filter-select__option')
      .filter({ hasText: exactText(name) });
  }

  labelNameFilter(): Locator {
    return this.labelMenu().getByRole('textbox', { name: 'Filter by label name' });
  }

  editLabelControl(): Locator {
    return this.page
      .getByRole('link', { name: /edit label/i })
      .or(this.page.getByRole('button', { name: /edit label/i }));
  }

  async openLabelMenu(): Promise<Locator> {
    const menu = this.labelMenu();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.labelFilterControl.click();
      try {
        await expect(menu).toBeVisible({ timeout: attempt === 0 ? 3_000 : 10_000 });
        return menu;
      } catch (err) {
        if (attempt === 1) throw err;
      }
    }
    return menu;
  }

  /**
   * Opens the platform menu and picks that option inside the menu.
   * Matching the menu option avoids clicking the same name in the table.
   */
  async filterByPlatformOrLabel(name: string): Promise<void> {
    await this.openLabelMenu();
    const option = this.labelOption(name);
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await this.waitForLoaded();
  }

  /**
   * A missing label must not render the unfiltered fleet.
   * Fleet's 404 page has no host links. A Hosts page for that id is an empty table.
   */
  async expectUnknownLabel(id: number): Promise<void> {
    await this.page.goto(`/hosts/manage/labels/${id}`);
    const notFound = this.page.getByText(/can't find that page/i);
    await expect(notFound.or(this.heading)).toBeVisible();
    if (await notFound.isVisible()) {
      await expect(notFound).toBeVisible();
      await expect(this.hostLinks).toHaveCount(0);
      return;
    }
    await expect(this.heading).toBeVisible();
    await expect(this.emptyState).toBeVisible();
    await expect(this.hostLinks).toHaveCount(0);
  }

  pageSettingsMenu(): Locator {
    return this.page.locator('.actions-dropdown-select__menu');
  }

  pageSettingsOption(name: string): Locator {
    return this.pageSettingsMenu().locator('.actions-dropdown-select__option', { hasText: name });
  }

  enrollSecretsModal(): Locator {
    return this.page.locator('.modal__modal_container').filter({ hasText: 'Manage enroll secrets' });
  }

  async openPageSettings(): Promise<Locator> {
    await this.pageSettingsButton.click();
    const menu = this.pageSettingsMenu();
    await expect(menu).toBeVisible();
    return menu;
  }

  /**
   * Click a sortable header and wait until GET /hosts carries that column.
   * The row count does not change, so the heading staying visible is not enough.
   */
  async clickSortHeader(label: string, orderKey?: string, previousKey?: string | null): Promise<void> {
    const btn = this.columnHeaderButton(label);
    await btn.scrollIntoViewIfNeeded();
    const pending = this.page.waitForResponse(
      (res) => res.ok() && res.request().method() === 'GET' && isColumnSortResponse(res.url(), orderKey, previousKey),
    );
    await btn.click();
    await pending;
  }

  async sortByColumn(label: string): Promise<void> {
    await this.columnHeaderButton(label).click();
    await this.waitForLoaded();
  }

  async openEditColumns(): Promise<Locator> {
    await this.editColumnsButton.click();
    const modal = this.editColumnsModal();
    await expect(modal).toBeVisible();
    return modal;
  }

  /** Toggle a column checkbox in the Edit columns modal by its visible label, then Save. */
  async toggleColumnAndSave(columnLabel: string): Promise<void> {
    const modal = await this.openEditColumns();
    await modal.getByText(columnLabel, { exact: true }).click();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).toBeHidden();
    await this.waitForLoaded();
  }

  async openAddHosts(): Promise<Locator> {
    await this.addHostsButton.click();
    const modal = this.addHostsModal();
    await expect(modal).toBeVisible();
    return modal;
  }

  async openHost(name: string): Promise<void> {
    await this.hostLink(name).click();
    await expect(this.page).toHaveURL(/\/hosts\/\d+\/details/);
  }

  /** Label id from /hosts/manage/labels/:id URLs, or null when on plain /hosts/manage. */
  labelIdFromUrl(): number | null {
    const m = this.page.url().match(/\/hosts\/manage\/labels\/(\d+)/);
    return m ? Number(m[1]) : null;
  }
}
