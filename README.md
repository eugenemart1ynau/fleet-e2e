# fleet-e2e

Playwright + TypeScript end-to-end tests for two Fleet pages, run against a fresh `fleetctl preview`:

- **Hosts** — `http://localhost:1337/hosts/manage`
- **Host details** — `/hosts/:id/*`, opened by clicking a host

## Prerequisites

- Node 20+ (tested on Node 22)
- Docker with Fleet preview running:
  ```bash
  fleetctl preview          # login:  / REDACTED#
  # when finished:
  fleetctl preview stop
  ```

## Run

```bash
npm ci
npx playwright install chromium
cp .env.example .env      # optional; defaults match fleetctl preview

npm test                  # api + setup -> chromium (read-only) -> destructive -> api-destructive
npm run test:api          # API only (no browser, read-only, ~30-50s)
npm run test:api:destructive  # API DELETE /hosts/:id (deletes one simulated Linux host)
npm run test:ui-only      # UI projects only
npm run test:smoke        # @smoke only (UI + API)
npm run test:headed
npm run test:ui
npm run report            # open last HTML report (traces kept on failure)
npm run typecheck
```

## Architecture

```
playwright.config.ts        projects: api, api-destructive (browserless, *.api.spec.ts);
                            setup -> chromium -> destructive (UI); retries, trace on failure
src/
  config/env.ts             BASE_URL / FLEET_EMAIL / FLEET_PASSWORD etc. with preview defaults
  global-setup.ts           readiness gate: /healthz, API login, wait for enrolled + online Linux hosts
  api/FleetApiClient.ts     typed REST client = test oracle (login, listHosts, countHosts, getHost,
                            getHostSoftware, deleteHost, refetchHost, waitForHosts, setHiddenHostColumns)
                            + raw get/post/patch/delete, anonymous(), withToken(), rawLogin() (429 backoff)
  api/assertions.ts         expectStatus, expectJson, expectFleetError (Fleet error envelope), expectEvery
  api/types.ts              API response shapes (Fleet v4.94)
  pages/                    Page Objects: LoginPage, HostsPage, HostDetailsPage, components/DeleteHostModal
  fixtures/index.ts         UI `test`: api (worker-scoped), page objects, linuxHost
  fixtures/api.ts           API `test`: api (admin, worker), anonApi (no auth), allHosts, knownHost
  utils/apiData.ts          missingHostId(), ids() helpers
  utils/hostPicker.ts       prefers simulated Linux hosts over the local Mac
tests/
  api/                      *.api.spec.ts: auth, hosts list/count/status/search, host details + software,
                            hosts-delete (@destructive, own project)
  setup/auth.setup.ts       UI login once -> .auth/admin.json (storageState, token cookie)
  hosts/                    list, search, status filter
  host-details/             header/tabs, vitals, software, delete (@destructive)
```

Design decisions:

- **API as oracle.** UI assertions compare against what the API returns *now* (counts, names, OS), so tests don't hard-code host data that differs per machine.
- **Auth once.** A setup project logs in through the real UI and saves `storageState`; all tests reuse it. The API client logs in separately with a Bearer token.
- **Readiness gate.** Fresh preview instances take minutes to enroll hosts; global setup polls and fails with a clear message instead of N timeouts.
- **Host choice.** Tests use simulated Linux hosts (identical on every machine, disposable) rather than the developer's Mac.
- **Destructive isolation.** Delete tests are tagged `@destructive` and run in their own project *after* the read-only suite. They target a different host than read-only tests. Preview agents re-enroll after delete, so tests assert the old id returns 404 rather than "gone forever".
- **API layer.** API specs (`tests/api/*.api.spec.ts`, tag `@api`) run in their own browserless project and use `src/fixtures/api.ts`, so they never need the UI login. They check contract and data rules (status codes, error envelopes, filter/search/count consistency) directly, while the UI suite keeps using the same client as its oracle. `/login` is rate-limited by Fleet (429), so login helpers back off on 429.
- **Locators.** Fleet has almost no `data-testid`s; locators are role/placeholder/text first, with a few documented CSS hooks (`.table-count`, `td.display_name__cell a`, `.modal__modal_container`) centralized in page objects.

## What's automated and why

See [COVERAGE.md](./COVERAGE.md). Priority: what would hurt most if it broke — seeing the fleet inventory, finding a host, triaging by status, trusting a host's data, and destructive actions behaving safely.

## Next with more time

- SHOULD items in COVERAGE.md: sort, edit columns persistence, export CSV vs API, bulk delete, back-navigation memory, Refetch
- Seed custom labels via API for label filter tests
- Data-builder layer (create labels/policies via API, clean up in fixtures)
- CI workflow spinning up `fleetctl preview` in GitHub Actions
- axe accessibility smoke on both pages

## AI disclosure

AI tooling was used to help scaffold this framework and read Fleet source for expected behavior; all tests were run and reviewed against a live preview.
