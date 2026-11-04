# fleet-e2e

This repo is a Playwright + TypeScript suite for two pages in [Fleet](https://fleetdm.com): the host inventory, and the host you land on when you click a row.

The goal is simple. If someone changes Hosts or host details, these tests should say whether an operator can still see the fleet, find a host, trust the facts on the page, and delete a host without surprises. Every check compares the screen (or the HTTP response) to what Fleet's API returns on this run. Nothing is pinned to a laptop name, a host count, or a screenshot from last week.

It runs against a fresh [`fleetctl preview`](https://fleetdm.com/docs/using-fleet/fleetctl-cli#fleetctl-preview). That is Fleet's free local sandbox: Docker, a few simulated hosts, and the preview login on [fleetdm.com/try-fleet](https://fleetdm.com/try-fleet). Premium and MDM controls are listed in [COVERAGE.md](./COVERAGE.md) and left alone, because preview cannot exercise them.

## Start here

`npm run test:smoke` is the priority pass: the checks that would hurt immediately if Hosts or host details broke. `npm test` is the full matrix, including the extra filters and the Chrome delete. Controls that leave these two pages, or that free preview cannot exercise, are left out on purpose. That list is [COVERAGE.md](./COVERAGE.md).

Serial search and computer-name search run only when some enrolled host reports them. Simulated Linux hosts leave serial blank and copy the hostname into the computer name, so those cases skip on a preview that has no other machine. Prefix, UUID, and IP still run on the simulated Linux host.

## What we cover

Two surfaces, and the controls that stay on them.

- **Hosts** at `http://localhost:1337/hosts/manage`. Search, status, platform and builtin labels, sort, edit columns, export, row selection, Add hosts, and the page-settings enroll-secrets modal.
- **Host details** after you click a host. The Details, Software, Policies, and Reports tabs. Vitals, side cards, refetch, the Actions menu, and Delete.
- **Still this page:** `/hosts/manage/labels/:id`, and modals that close without sending you somewhere else.

We stop at a control that would leave. A software title, a policy, a query, the label editor, script run, and settings are out. So are Run script, Transfer, Lock, Unlock, Wipe, and MDM items: the tests can see the name, and they do not click it. The account menu is out too, except Sign out at the end of the one full journey.

The living list of what is automated, planned, or out of scope is [COVERAGE.md](./COVERAGE.md).

## Browsers

Read-only UI runs in three browsers, from the same specs, on every `npm test` and `npm run test:ui-only`:

| Browser in the report | What Playwright launches       | Projects                                      |
| --------------------- | ------------------------------ | --------------------------------------------- |
| Chrome                | Desktop Chrome (Chromium)      | `chrome`, plus the login setup and the delete |
| Firefox               | Desktop Firefox                | `firefox`                                     |
| Safari                | WebKit, the engine Safari uses | `safari`                                      |

Smoke, regression, and the one Hosts and host-details journey each run in all three. Install them once with `npx playwright install chromium firefox webkit`.

The host delete runs once, in Chrome only, after Chrome, Firefox, and Safari have finished. It is not repeated in Firefox or Safari. API specs do not open a browser.

To run the read-only UI in one browser while you are writing a test:

```bash
npx playwright test tests/ui/smoke tests/ui/regression tests/ui/e2e --project=chrome
npx playwright test tests/ui/smoke tests/ui/regression tests/ui/e2e --project=firefox
npx playwright test tests/ui/smoke tests/ui/regression tests/ui/e2e --project=safari
```

## What you need

- **Node 20 or newer**, from [nodejs.org](https://nodejs.org). This repo requires it in `package.json`.
- **Docker, running**, from [docker.com](https://www.docker.com). `fleetctl preview` uses it.
- **`fleetctl`**, installed from [fleetdm.com/try-fleet](https://fleetdm.com/try-fleet). No license key. That page also has the preview email and password.
- **Playwright browsers.** After `npm ci`, install Chrome, Firefox, and WebKit with the command in First run.
- **A `.env` file** in the repo root. Create it yourself. The suite does not start without `FLEET_EMAIL` and `FLEET_PASSWORD`. `.env` stays untracked.

Quote the password. A `#` in an unquoted value starts a comment, so the rest of the line is dropped.

```bash
BASE_URL=http://localhost:1337
FLEET_EMAIL=<email on https://fleetdm.com/try-fleet>
FLEET_PASSWORD="<password on that same page>"
```

`BASE_URL`, `MIN_HOSTS`, `READINESS_TIMEOUT_MS`, and `WORKERS` already have defaults in code. Only the two login variables are required.

## First run

Start the sandbox and leave that terminal open. The first start downloads images and can take a few minutes. Simulated hosts enroll after Fleet is up, and the Linux host needs a moment to report software.

```bash
fleetctl preview
```

In another terminal, from this repo, install dependencies, install the three browsers, create `.env` as above, then run the suite:

```bash
npm ci
npx playwright install chromium firefox webkit
npm test
```

`npm test` is the whole suite. A healthy preview with a handful of hosts usually finishes in a few minutes. Global setup prints a line like this when it is willing to start:

```text
[global-setup] Fleet ready at http://localhost:1337: 8 hosts (8 online), 102 software titles on <linux-host>
```

When you are done with the sandbox, stop it with the same `fleetctl` you started. If that binary lives under your home directory:

```bash
fleetctl preview stop
# or: ~/.fleetctl/fleetctl preview stop
```

## How a full run moves

Playwright does not throw every file at the browser at once. [`playwright.config.ts`](./playwright.config.ts) splits the work into projects.

1. **Global setup** polls `GET /healthz`, logs in through the API, and waits until there are at least `MIN_HOSTS` hosts, one of them an online simulated Linux host, and that host has reported software. If preview is down, or the agent has not reported software yet, setup fails with that reason. Software tests used to skip on an empty inventory. They now expect titles, so setup waits for them.
2. **API project** talks to `/api/latest/fleet` with no browser. It checks status codes, error envelopes, filters, search, CSV export, labels, and column settings. It does not include the tests tagged `@destructive`.
3. **Setup project** logs in through the real login form once and writes `.auth/admin.json`. Chrome, Firefox, and Safari reuse that session.
4. **Chrome, Firefox, and Safari** run the read-only UI together: `tests/ui/smoke`, `tests/ui/regression`, and the one journey in `tests/ui/e2e`. Safari here is Playwright's WebKit. Chrome is Desktop Chrome (Chromium).
5. **Destructive project** runs after those three browsers, in Chrome only. It deletes one spare online Linux host. Retries are off, so a failed assertion cannot delete a second host on the way down.
6. **API destructive project** runs last. Those specs are `test.describe.fixme`. They document authenticated delete calls and do not remove a host, because Fleet cannot put the same id back. Re-enrollment creates a new one.

Locally, retries are 0, so a flake fails the first time. If `CI` is set, read-only projects retry twice. The delete project stays at 0 either way.

Workers default to 2. The suite shares one preview and one admin user. Edit columns is a single saved setting (`hidden_host_columns`), so those tests take a file lock at `.auth/host-columns.lock`. Other tests still assume the default columns. Keep `WORKERS` at 1 or 2. Four workers against one preview is how login starts returning 429. The API client already backs off on 429, and a quieter worker count is the better fix. `npm run test:headed` forces one worker so the visible Chrome, Firefox, and Safari windows do not close each other's menus.

## Commands

Each command prints one line per test, with a checkmark or a cross.

| You want                                                                                 | Command                        |
| ---------------------------------------------------------------------------------------- | ------------------------------ |
| Everything                                                                               | `npm test`                     |
| Read-only API only                                                                       | `npm run test:api`             |
| API happy paths                                                                          | `npm run test:api:smoke`       |
| API extras, without the smoke rows                                                       | `npm run test:api:regression`  |
| API delete specs (they are `fixme` and do not delete)                                    | `npm run test:api:destructive` |
| All UI, including the Chrome delete at the end                                           | `npm run test:ui-only`         |
| UI smoke, three browsers, no delete                                                      | `npm run test:ui:smoke`        |
| UI regression, three browsers, no delete                                                 | `npm run test:ui:regression`   |
| The one Hosts and host-details journey, three browsers, no delete                        | `npm run test:ui:e2e`          |
| Anything tagged `@smoke`, API and UI                                                     | `npm run test:smoke`           |
| Host delete. Also runs the three read-only browsers first, because delete waits for them | `npm run test:destructive`     |
| Watch the browser, one window at a time                                                  | `npm run test:headed`          |
| Playwright's UI mode                                                                     | `npm run test:ui`              |
| Open the last HTML report                                                                | `npm run report`               |
| Typecheck the suite and the coverage atlas                                               | `npm run typecheck`            |
| Lint                                                                                     | `npm run lint`                 |
| Check formatting                                                                         | `npm run format:check`         |
| Launch the coverage dashboard                                                            | `npm run coverage`             |
| Refresh the dashboard screenshots from preview, then open it                             | `npm run coverage:shots`       |

A single file, one browser, no retry:

```bash
npx playwright test tests/ui/smoke/hosts/search.spec.ts --project=chrome --retries=0
```

`--project=chrome` still runs the login setup it depends on. To poke at one test while you write it, add `--headed`.

`npm run test:ui` opens Playwright's interactive runner. It is not the UI suite. The UI suite is `npm run test:ui-only` and the `test:ui:*` scripts above.

## What the tests are trying to prove

Priority, in order: you can see the inventory, you can find a host, you can triage by status, the facts on a host match the API, and delete either leaves the host alone or removes the one you chose.

Read-only UI uses the first online simulated Linux host (`pickLinuxHost` in `src/utils/hostPicker.ts`). That host is the same shape on every machine. The delete test picks a different online Linux host, the last spare by id, and fails if there is no spare. After confirm, it asserts the old id is 404. Preview's agent comes back as a new id, so the test does not claim the hostname is gone forever.

Serial search and a computer name that differs from the hostname use whichever enrolled host reports those fields. The simulated Linux hosts leave serial blank and copy the hostname into computer name, so a preview that is only those containers fails those two checks.

Assertions that would print an enroll secret use a boolean membership check (`expectIncluded`). A failure says the secret did not match. It does not paste the secret into the HTML report.

Each read-only test carries one tag, on the test itself:

- `@smoke` is the one happy path for that area.
- `@regression` is the rest: empty states, bad ids, combined filters, deep links.
- `@destructive` sits on the delete describe. Those tests do not also wear smoke or regression.

Above every UI test is a three-line comment: Action, Checks, Why. API tests use Call, Checks, Why. The coverage dashboard reads those comments. If you add a test, write the comment and add a row to `COVERAGE.md`. A new UI test also needs a hotspot in [`tools/coverage/atlas.ts`](./tools/coverage/atlas.ts). `npm run coverage` fails if a test has no Action/Call, Checks, and Why, or if a UI test is not on a hotspot.

Locators live in the page objects. Role, placeholder, or visible text first. A CSS hook only when Fleet has no accessible name (react-select menus, a few modal classes). Specs should call the page object instead of querying the DOM themselves.

## Layout

```
playwright.config.ts          projects, timeouts, trace on failure
src/
  config/env.ts               BASE_URL, login, workers, readiness. Login is required in .env
  global-setup.ts             health, hosts, and software before any project starts
  api/FleetApiClient.ts       the oracle: login, hosts, software, labels, columns, enroll secret
  api/assertions.ts           status, JSON, Fleet error envelope, secret-safe membership
  api/types.ts                response shapes
  fixtures/index.ts           UI test: page objects, api, linuxHost
  fixtures/api.ts             API test: admin client, anonymous client, all hosts
  fixtures/apiClient.ts       shared login for those fixtures
  pages/                      LoginPage, HostsPage, HostDetailsPage, DeleteHostModal
  utils/hostPicker.ts         simulated Linux, not the Mac running Docker
  utils/apiData.ts            no-match queries, missing ids, CSV parse
  utils/columnLock.ts         one-at-a-time edit-columns
tests/
  api/                        auth, hosts, host details, hosts-delete (fixme for real deletes)
  ui/setup/auth.setup.ts      one UI login, saved to .auth/admin.json
  ui/smoke/                   one happy path per area
  ui/regression/              the rest of the in-scope controls
  ui/e2e/hosts-and-details.spec.ts
                              login, Online filter, open the Linux host, Software, Back, Sign out
  ui/destructive/host-details/delete-host.spec.ts
                              cancel, then confirm, on a spare Linux host
tools/coverage/               builds the dashboard from the Action/Call comments
coverage-dashboard/           index.html, masked screenshots, hotspot boxes
```

Timeouts in the Playwright config: 60 seconds for a test, 10 seconds for an assertion, 15 seconds for an action, 30 seconds for a navigation. The "click every column header" sort test raises its own timeout to 3 minutes.

On failure, Playwright keeps a trace, a screenshot, and a video. `npm run report` opens them. API projects turn trace, screenshot, and video off.

## Configuration

Create a `.env` in the repo root. Set `FLEET_EMAIL` and `FLEET_PASSWORD` from [fleetdm.com/try-fleet](https://fleetdm.com/try-fleet). Quote the password, because `#` starts a comment. Do not commit `.env`.

| Variable               | Default                 | What it does                                                       |
| ---------------------- | ----------------------- | ------------------------------------------------------------------ |
| `BASE_URL`             | `http://localhost:1337` | Preview origin. No trailing slash required                         |
| `FLEET_EMAIL`          | none                    | Preview admin from try-fleet. Required                             |
| `FLEET_PASSWORD`       | none                    | Preview password from that same page. Required. Quote it           |
| `MIN_HOSTS`            | `2`                     | How many enrolled hosts setup waits for                            |
| `READINESS_TIMEOUT_MS` | `180000`                | How long setup waits for Fleet, hosts, and software                |
| `WORKERS`              | `2`                     | Playwright workers. Stay at 1 or 2 on one preview                  |
| `CI`                   | unset                   | When set, read-only retries become 2 and `test.only` fails the run |

`.env`, `.auth/` (the saved login and the column lock), `test-results/`, `playwright-report/`, `coverage-dashboard/screens-next/`, and `*.pkg` are gitignored. A downloaded osquery installer from the Add hosts modal does not belong in the repo. The dashboard page and its masked screenshots are kept.

## Coverage dashboard

Launch it from the repo root. This rebuilds `coverage-dashboard/index.html` from the Action/Call, Checks, and Why comments and opens it. Preview does not need to be running.

```bash
npm run coverage
```

Set `COVERAGE_NO_OPEN=1` to write the file and leave it closed. To open the last build without rebuilding:

```bash
open coverage-dashboard/index.html
```

The page is the spec map, not the last Playwright run. A green run does not mean an unlisted control was tested. Read-only UI is counted once, even though those specs run in Chrome, Firefox, and Safari. The kinds are smoke, regression, the one journey, the Chrome delete, and the API deletes that are written but not run. The overview opens with the total number of tests and names every control: covered, seen and not followed, or left out.

The views are overview bars, Hosts and host details with screenshots, journeys, API groups, what was left out, and all tests. Click a region on a screenshot to read that test. Journey steps and API group chips jump to that step or group. The All tests box filters by title, action, and why.

The page is dark. The screenshots stay the light Fleet UI, with the enroll secret masked.

To photograph the live pages and then open the dashboard, start `fleetctl preview` first, then:

```bash
npm run coverage:shots
```

That command takes the screenshots, masks the enroll secret before saving, rebuilds the page, and opens it. It does not confirm Delete or post a secret. Hotspot boxes are measured on the live page, so after a Fleet layout change, run `npm run coverage:shots` again. The masked PNGs live in `coverage-dashboard/screens/` and are kept. Only `coverage-dashboard/screens-next/`, the in-progress capture, is gitignored.

## Static checks

`npm run typecheck` runs the suite project and [`tsconfig.tools.json`](./tsconfig.tools.json), which covers [`tools/coverage/`](tools/coverage). `npm run lint` is ESLint. `npm run format:check` is Prettier. `npm run format` writes the Prettier result.

[`.github/workflows/check.yml`](./.github/workflows/check.yml) runs those three on push and pull request, on Node 20.

[`.github/workflows/tests.yml`](./.github/workflows/tests.yml) boots `fleetctl preview` on the same events and runs the suite in order: API, smoke, regression, E2E, then the Chrome delete. The preview password is the `FLEET_PASSWORD` repository secret, so the log shows `***` instead of the value. When a layer fails, the trace, the HTML report, and `preview.log` are uploaded for that layer.

## When setup fails

- **Fleet not healthy at `/healthz`.** Preview is not up, or Docker is not. Start `fleetctl preview` and wait until the UI loads in a browser.
- **Timed out waiting for hosts.** The simulated agents have not enrolled yet. Give preview another minute and run again, or raise `READINESS_TIMEOUT_MS`.
- **Linux host reported no software.** The same host the UI reads has an empty inventory. Setup will not skip past that. Wait for the agent, then rerun.
- **429 on login.** Too many workers, or another suite is logging in to the same preview. Set `WORKERS=1`.

## Next, with more time

- Turn on the authenticated `DELETE /hosts/:id` and `POST /hosts/delete` specs once a deleted host can be restored. They stay `test.fixme` until then. Re-enrollment is a new id.
- Seed custom labels through the API so label-filter tests can cover a label we created, then clean it up.
- A small data builder for labels and policies, with cleanup in fixtures. Populated Policies and Reports tables need that, and seeding them leaves these two pages, so it stays future work.
- An axe accessibility pass on both pages.

Rows still marked planned in [COVERAGE.md](./COVERAGE.md) are the SHOULD items. Back navigation and the in-scope Hosts controls are already covered.

## Writing rules

[`.cursor/rules/`](./.cursor/rules) is the short version of how to add a test: stay on these two pages, tag the test, put locators in the page objects, and assert against `FleetApiClient`. Bugs and product questions for this suite go in GitHub issues on this repo.

## AI disclosure

AI tooling was used to help scaffold this framework and to read Fleet source for expected behavior. The tests were run and reviewed against a live preview.
