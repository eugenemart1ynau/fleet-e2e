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
  readonly activityHeading: Locator;
  readonly labelsHeading: Locator;
  readonly userHeading: Locator;
  readonly agentOptionsHeading: Locator;
  readonly deleteModal: DeleteHostModal;

  constructor(page: Page) {
    super(page);
    this.displayName = page.locator('h1.display-name');
    this.backButton = page.getByRole('button', { name: 'Back to all hosts' });
    this.refetchButton = page.getByRole('button', { name: /Refetch|Fetching fresh vitals/ });
    this.actionsDropdown = page.locator('button, [role="button"]').filter({ hasText: /^Actions$/ });
    this.vitalsCard = page
      .locator('.card, section')
      .filter({ has: page.getByText('Vitals', { exact: true }) })
      .first();
    this.softwareSearch = page.getByPlaceholder('Search by name or vulnerability (CVE)');
    this.activityHeading = page.getByText('Activity', { exact: true });
    this.labelsHeading = page.getByText('Labels', { exact: true });
    this.userHeading = page.getByText('User', { exact: true });
    this.agentOptionsHeading = page.getByText('Agent options', { exact: true });
    this.deleteModal = new DeleteHostModal(page);
  }

  /** Navigation that is allowed to land on Fleet's 404 page or the route loader. */
  async pageGoto(path: string): Promise<void> {
    await this.page.goto(path);
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

  /** Value row inside the Vitals card, e.g. vital('Operating system'). */
  vital(label: string): Locator {
    return this.vitalsCard.locator('.info-flex__item, [class*="data-set"]').filter({ hasText: label }).first();
  }

  notFoundCopy(): Locator {
    return this.page.getByText(/can't find that page/i);
  }

  async expectFleetNotFound(): Promise<void> {
    await expect(this.page.getByText(/404:\s*We can't find that page!/i)).toBeVisible();
    await expect(this.page.getByText(/moved, or doesn't exist/i)).toBeVisible();
    await expect(this.page.locator('h1.display-name, .display-name')).toHaveCount(0);
  }

  /** Fleet's route loader. A blank document is not this. */
  loadingIndicator(): Locator {
    return this.page.locator('[class*="spinner"], [role="progressbar"]').or(this.page.getByText(/^Loading/));
  }

  /**
   * /hosts/abc and /hosts/0 stay on the loader in this build, or show Fleet's 404.
   * Either is a settled page. A host header is not.
   */
  async expectNoHost(): Promise<void> {
    await expect(this.notFoundCopy().or(this.loadingIndicator())).toBeVisible();
    await expect(this.page.locator('h1.display-name, .display-name')).toHaveCount(0);
  }

  actionOption(name: string): Locator {
    return this.page.getByTestId('dropdown-option').filter({ hasText: name });
  }

  async openAction(option: 'Delete' | string): Promise<void> {
    await this.actionsDropdown.click();
    await this.actionOption(option).click();
  }

  softwareCount(count: number): Locator {
    return this.page.getByText(new RegExp(`^${count} items?$`));
  }

  softwareNameSort(): Locator {
    return this.page.locator('th button').filter({ hasText: /^Name$/ });
  }

  softwareRows(): Locator {
    return this.page.locator('table tbody tr');
  }

  softwareTitleLinks(): Locator {
    return this.page.locator('table tbody a');
  }

  softwareEmptyCopy(): Locator {
    return this.page.getByText('No items match the current search criteria');
  }

  softwareCell(name: string): Locator {
    return this.page.getByRole('cell', { name }).first();
  }

  policiesCount(): Locator {
    return this.page.getByText(/\d+ polic(?:y|ies)/);
  }

  /** Empty-state copy. The Policies tab name alone does not satisfy this. */
  policiesEmptyCopy(): Locator {
    return this.page.getByText(/No policies checked|Manage policies/i).first();
  }

  reportsCount(): Locator {
    return this.page.getByText(/\d+ reports?/);
  }

  /** Empty-state copy. The Reports tab name alone does not satisfy this. */
  reportsEmptyCopy(): Locator {
    return this.page.getByText(/No reports scheduled|Schedule a report/i).first();
  }

  activityCopy(): Locator {
    return this.page.getByText(/No activity|Past|Upcoming/i).first();
  }

  userIdpLabel(): Locator {
    return this.page.getByText('Username (IdP)').first();
  }

  async searchSoftware(text: string): Promise<void> {
    await this.softwareSearch.fill(text);
    if (text.trim()) await expect(this.page).toHaveURL(new RegExp(`query=${encodeURIComponent(text.trim())}`));
    else await expect(this.page).not.toHaveURL(/query=/);
  }

  /** Waits until one of `names` is actually visible. */
  async expectOneLabelVisible(names: string[]): Promise<void> {
    await expect
      .poll(
        async () => {
          for (const name of names) {
            if (await this.page.getByText(name, { exact: true }).first().isVisible()) return name;
          }
          return '';
        },
        { message: `expected one of ${names.join(', ')} on the Labels card` },
      )
      .not.toBe('');
  }

  async clickRefetch(): Promise<void> {
    await this.refetchButton.click();
  }

  async backToAllHosts(): Promise<void> {
    await this.backButton.click();
    await expect(this.page).toHaveURL(/\/hosts\/manage/);
  }
}
