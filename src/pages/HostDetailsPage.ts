import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { DeleteHostModal } from './components/DeleteHostModal';

export type HostTab = 'Details' | 'Software' | 'Reports' | 'Policies';

/** /hosts/:id/(details|software|reports|policies) */
export class HostDetailsPage extends BasePage {
  readonly displayName: Locator;
  readonly backButton: Locator;
  readonly refetchButton: Locator;
  readonly actionsDropdown: Locator;
  readonly vitalsCard: Locator;
  readonly softwareSearch: Locator;
  readonly deleteModal: DeleteHostModal;

  constructor(page: Page) {
    super(page);
    this.displayName = page.locator('h1.display-name, .display-name').first();
    this.backButton = page.getByRole('button', { name: 'Back to all hosts' });
    this.refetchButton = page.getByRole('button', { name: /Refetch|Fetching fresh vitals/ });
    this.actionsDropdown = page.getByText('Actions', { exact: true }).first();
    this.vitalsCard = page.locator('.card, section, div').filter({ has: page.getByText('Vitals', { exact: true }) }).last();
    this.softwareSearch = page.getByPlaceholder('Search by name or vulnerability (CVE)');
    this.deleteModal = new DeleteHostModal(page);
  }

  async goto(id: number, tab: 'details' | 'software' | 'reports' | 'policies' = 'details'): Promise<void> {
    await this.page.goto(`/hosts/${id}/${tab}`);
    await this.waitForLoaded();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.displayName).toBeVisible();
  }

  tab(name: HostTab): Locator {
    return this.page.getByRole('tab', { name: new RegExp(`^${name}`) });
  }

  async openTab(name: HostTab): Promise<void> {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  /** Value next to a vitals label, e.g. vital('Operating system'). */
  vital(label: string): Locator {
    return this.page.locator('.info-flex__item, [class*="data-set"]').filter({ hasText: label }).first();
  }

  async openAction(option: 'Delete' | string): Promise<void> {
    await this.actionsDropdown.click();
    await this.page.getByTestId('dropdown-option').filter({ hasText: option }).click();
  }
}
