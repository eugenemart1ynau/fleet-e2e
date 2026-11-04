import { test } from '../../../../src/fixtures';
import { missingHostId } from '../../../../src/utils/apiData';

/**
 * Action: open host details for an id that is not in the fleet.
 * Checks: Fleet's own 404 page is what the operator sees for a missing numeric id. A non-numeric id and id 0 do not render a host header, and the page has settled on the 404 copy or the route loader.
 * Why: a bad or deleted host link must not render another host.
 */
test.describe('Host details – unknown host', () => {
  /**
   * Action: open /hosts/{id}/details for an id missing from GET /hosts.
   * Checks: the page shows "404: We can't find that page!" and copy that the page moved or doesn't exist. No host header is rendered.
   * Why: an unknown id is a broken link, not an empty host.
   */
  test('bad host id shows the Fleet 404 page', { tag: '@regression' }, async ({ hostDetailsPage, api }) => {
    const hosts = await api.listHosts();
    const id = missingHostId(hosts);
    await hostDetailsPage.pageGoto(`/hosts/${id}/details`);
    await hostDetailsPage.expectFleetNotFound();
  });

  /**
   * Action: open /hosts/abc/details and /hosts/0/details.
   * Checks: Fleet's 404 copy or the route loader is visible, and no host header is rendered. A blank document fails.
   * Why: a non-numeric id and id 0 must not render another host. A missing numeric id uses the 404 page; these two stay on the loader in this build.
   */
  test('non-numeric id and id 0 do not render a host', { tag: '@regression' }, async ({ hostDetailsPage }) => {
    for (const path of ['/hosts/abc/details', '/hosts/0/details']) {
      await hostDetailsPage.pageGoto(path);
      await hostDetailsPage.expectNoHost();
    }
  });
});
