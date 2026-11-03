import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { DeleteHostModal } from './components/DeleteHostModal';

export type StatusOption = 'All hosts' | 'Online hosts' | 'Offline hosts' | 'Missing hosts' | 'New hosts' | 'Enrolled hosts';

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
  readonly deleteModal: DeleteHostModal;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Hosts' });
    this.search = page.getByPlaceholder('Search name, user email, hostname, UUID, serial number, or IP address');
    this.statusFilter = page.getByRole('combobox', { name: 'Filter by status' });
    this.labelFilter = page.getByText('Filter by platform or label');
    this.count = page.locator('.table-count');
    this.table = page.locator('table');
    this.rows = this.table.locator('tbody tr');
    this.hostLinks = page.locator('td.display_name__cell a');
    this.emptyState = page.locator('.empty-state');
    this.addHostsButton = page.getByRole('button', { name: 'Add hosts' });
    this.exportButton = page.getByRole('button', { name: 'Export hosts' });
    this.editColumnsButton = page.getByRole('button', { name: 'Edit columns' });
    this.deleteModal = new DeleteHostModal(page);
  }

  async goto(query: Record<string, string> = {}): Promise<void> {
    const qs = new URLSearchParams(query).toString();
    await this.page.goto(`/hosts/manage${qs ? `?${qs}` : ''}`);
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

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
    // input is debounced 500ms and synced into ?query=
    if (text.trim()) await expect(this.page).toHaveURL(new RegExp(`query=${encodeURIComponent(text.trim())}`));
    else await expect(this.page).not.toHaveURL(/query=/);
  }

  async filterByStatus(option: StatusOption): Promise<void> {
    // react-select's combobox is a 1px dummy input; open the menu via keyboard.
    await this.statusFilter.focus();
    await this.page.keyboard.press('ArrowDown');
    // Fleet's custom Option renders without role="option"; react-select still assigns ids "react-select-N-option-M".
    await this.page.locator('[id*="-option-"]').filter({ hasText: new RegExp(`^${option}`) }).first().click();
  }

  async openHost(name: string): Promise<void> {
    await this.hostLink(name).click();
    await expect(this.page).toHaveURL(/\/hosts\/\d+\/details/);
  }
}
