# Test coverage by layer

Scope: the two pages named in the assessment email, Hosts (`/hosts/manage`) and Host details (`/hosts/:id/...`), on a fresh `fleetctl preview` (Fleet free, v4.94.0). Links that leave these pages (label editor, software title page, policy/report pages, scripts) are not followed.

Source of truth: `fleetdm/fleet` frontend and server code (see the requirements brief), checked against the running preview.

## Layers

| Layer | What it means here | Tooling in this repo |
|---|---|---|
| API | Direct REST calls to Fleet with no browser. Checks the contract (status codes, response shape) and data correctness (filters, counts, search, delete). | `FleetApiClient` via Playwright `request` context |
| Integration | One UI action wired to one backend effect, without a full user journey. Typical checks: URL query params drive the API request, a UI setting is persisted by the API and reapplied on reload, the export request matches what the table shows. Uses `page.waitForRequest` / `waitForResponse` or the API as oracle. | Playwright page + network assertions + `FleetApiClient` |
| E2E | A full user journey in the browser as a user would do it: find a host, filter, open details, check data, delete with cancel and confirm. The API is used only as the oracle for what the UI should show. | Page objects (`HostsPage`, `HostDetailsPage`, `DeleteHostModal`) + fixtures |

Why split this way: the API layer is fast and catches server regressions (wrong filter SQL, broken delete) without UI noise. Integration catches the most common frontend bugs on these pages, which are wiring bugs (URL param not sent, setting not saved, wrong export columns). E2E is kept small and covers the journeys that hurt most if broken.

Status values:
- Automated: a passing spec exists.
- Automated (not run): spec exists but has not been run against preview yet.
- Partial: covered indirectly or only one variant.
- Gap: in scope, no automation yet.
- N/A: out of scope or not reachable on free preview (reason given).

Priority: P0 = core, breakage blocks users from seeing or acting on hosts. P1 = important triage or data trust. P2 = lower risk or edge.

## Hosts page (`/hosts/manage`)

| # | Use case | API cases | Integration cases | E2E cases | Priority | Current status |
|---|---|---|---|---|---|---|
| H1 | See all enrolled hosts | `GET /api/latest/fleet/hosts?per_page=50&order_key=display_name&order_direction=asc` returns 200, each host has id, display_name, status, platform. `GET /hosts/count` equals list length (under 50). Unauthenticated request returns 401. | Initial load rewrites URL to `?page=0&order_key=display_name&order_direction=asc`. API error (route intercept 500) renders the DataError state instead of the table. | Open Hosts, H1 "Hosts", count text "N hosts" and row names match API. | P0 | E2E: Automated (`hosts/hosts-list`). API: Automated (`api/hosts`: shape, count == list, sort, pagination, 400/422; `api/auth`: 401). Integration: Partial (default `order_key` in URL asserted; DataError not covered) |
| H2 | Open a host from the list | `GET /hosts/:id` for an id from the list returns 200 with matching display_name. | Host name link `href` is `/hosts/:id/details` (no `fleet_id` on free). Clicking a non-link part of the row does not navigate. | Click host name, lands on details with matching H1. | P0 | E2E: Automated (`hosts/hosts-list`). Integration: Gap (row-click no-op). API: Automated (`api/host-details`) |
| H3 | Find a host by search | `GET /hosts?query=<x>` matches on hostname, display_name, uuid, hardware_serial, primary_ip. Partial match works. `%` and `_` are treated literally. Whitespace-only query returns all. No match returns `[]` and count 0. | Typing sends one request after 500 ms debounce with trimmed `query` and `page=0`. Deep link `?query=x` pre-fills the input and sends `query=x`. | Search by hostname narrows list and URL shows `?query=`. No-match shows "No hosts match your filters" and controls stay enabled. Clearing search restores full list. | P0 | E2E: Automated (hostname search, no-match, deep link in `hosts/search`). Clear-search: Gap. API: Automated (`api/hosts`: hostname, prefix, uuid, serial, IP, case-insensitive, no-match, whitespace, literal `%`; `_` not covered). Integration: Partial (deep link only, no request assertion) |
| H4 | Filter by status | `GET /hosts?status=online|offline|new|missing` each returns only hosts with that status; count endpoint agrees. Invalid status value returns 4xx or is rejected. | Selecting "Online hosts" sets `?status=online&page=0` and the request carries `status=online`. Deep link `?status=offline` preselects the dropdown. Unknown `?status=foo` is ignored (shows All hosts). | Filter Online, rows match API. Filter Offline on a preview where all hosts are online shows the empty state. Back to "All hosts" restores full list. | P0 | E2E: Automated (Online only, `hosts/status-filter`). Offline: Gap (fixme). API: Automated (`api/hosts`: every status value, count == list, online/offline partition, invalid status 400). Integration: Partial (URL sync for Online) |
| H5 | Combine search and status | `GET /hosts?query=<x>&status=online` returns the intersection. | URL holds both params; changing status keeps `query`. | Search, then filter status; list narrows to intersection. | P1 | API: Automated (`api/hosts`: query+status). E2E/Integration: Gap |
| H6 | Filter by platform label | `GET /labels/:id/hosts` for builtin platform label (e.g. "Linux") returns only that platform. | Selecting a platform changes path to `/hosts/manage/labels/:id`, request goes to `/labels/:id/hosts`, no pill renders for platform labels. | Pick "Linux" in "Filter by platform or label", rows are Linux only. | P1 | Gap |
| H7 | Filter by custom label | `POST /labels` (setup), `GET /labels/:id/hosts` returns members. | Pill `hosts filtered by <label>` appears; "Remove <label> filter" returns to `/hosts/manage?page=0`. | Filter by a seeded label, remove pill, full list back. | P2 | Gap (needs seeded label). Label edit/delete from pill: N/A (leaves page) |
| H8 | Sort the table | `GET /hosts?order_key=display_name&order_direction=desc` returns reverse order. For `seen_time` the API direction is inverted vs UI. Invalid `order_key` returns 4xx. | Clicking a sortable header sets `?order_key=<col>&order_direction=asc|desc` and the request matches. Status header is not sortable. | Sort by Host name desc, first row matches API order. Check the sort button accessible name (suspected bug: header function interpolated into aria-label). | P1 | API: Automated (`api/hosts`: asc/desc reverse, invalid `order_key` 422; `seen_time` inversion not covered). E2E/Integration: Gap |
| H9 | Choose visible columns | `PATCH /api/latest/fleet/users/:id` with `settings.hidden_host_columns` returns 200; `GET /me` returns the saved settings. | Edit columns modal: hide a column, Save, header gone; reload and the column is still hidden (server-side). Cancel discards. Host and selection columns cannot be hidden. PATCH failure (intercept) shows "Couldn't save column settings. Please try again." and keeps modal open. | Open Edit columns, toggle a column, save, confirm table updates. | P1 | Gap. API helper `setHiddenHostColumns` exists (used for reset) |
| H10 | Export hosts to CSV | `GET /hosts/report?format=csv&columns=...` returns 200, CSV header matches requested columns, row count matches filtered count. | Click "Export hosts": request `columns` equals visible column ids (agent expands to orbit_version,osquery_version) and carries current `query`/`status`/`order_key`. Download name is `Hosts YYYY-MM-DD.csv`. Report error shows "Could not export hosts. Please try again." | Filter, export, open downloaded file, rows match visible list. | P1 | Gap |
| H11 | Bulk delete hosts | `POST /hosts/delete {ids:[...]}` returns 200; ids then 404 on `GET /hosts/:id`. Empty ids or unknown ids behave as documented (4xx or no-op). | Selecting a row checkbox shows "1 selected" bar and "Clear selection". Header checkbox selects all on page ("All hosts on this page are selected"). Cancel in modal sends no request. Error (intercept) shows "Could not delete hosts. Please try again." | Select one host, Delete, Cancel: host remains. Select, Delete, confirm: toast "Hosts successfully deleted.", count drops, API 404 for id. | P0 (confirm) / P1 (cancel) | Gap |
| H12 | Empty and error states | `GET /hosts/count` with no-match filter returns 0. | Intercept `/hosts` with 500 -> DataError. Intercept with `[]` and count 0 and no params -> "No hosts" and controls disabled, Export disabled. | No-match search empty state (see H3). | P1 | Partial (no-match E2E only) |
| H13 | Add hosts modal | `GET /spec/enroll_secret` returns at least one secret on preview. | `?add_hosts=1` opens the modal and removes the param. | Click "Add hosts", modal shows platform tabs and fleetctl command with copy button; close. | P2 | Gap |
| H14 | Enroll secrets via gear menu | `GET /spec/enroll_secret`. | `?manage_enroll_secrets=1` opens the modal. | Gear "Hosts page settings" -> "Enroll secrets" opens modal. "Activity automations" disabled on free. | P2 | Gap |
| H15 | Pagination and "Select all matching hosts" | `GET /hosts?page=1&per_page=50`. | `?page=N` past the end shows "No more hosts to display". | Next/previous page. | P2 | N/A on stock preview (needs 50+ hosts). API page param case is still possible |
| H16 | Premium and MDM features | | | Transfer, Pending status, Fleets dropdown and column, MDM columns. | - | N/A (Premium / MDM). One cheap check: these are absent on free |
| H17 | Run script (bulk) | | | | - | N/A (out of scope per email) |

## Host details (`/hosts/:id/details`)

| # | Use case | API cases | Integration cases | E2E cases | Priority | Current status |
|---|---|---|---|---|---|---|
| D1 | View host identity and status | `GET /hosts/:id?exclude_software=true` returns 200 with display_name, status, platform, os_version, primary_ip, seen_time. | `/hosts/:id` redirects to `/hosts/:id/details`. Document title is `<display_name> \| Hosts \| Fleet`. | Open a Linux host, H1 and Status match API. | P0 | E2E: Automated (`host-details/header`, includes title). API: Automated (`api/host-details`). Integration: Partial (redirect not asserted) |
| D2 | Host not found | `GET /hosts/999999` returns 404. `GET /hosts/abc` returns 4xx. | Navigate to `/hosts/999999/details` -> "404: We can't find that page!". Intercept 500 -> Fleet500 page. | | P1 | API: Automated (`api/host-details`: unknown id, `abc`, `0` -> 404). Integration: Gap |
| D3 | Check vitals | Host fields for OS, memory, cpu_type, hardware_model, primary_ip, public_ip, primary_mac, uptime are present and typed. | | Vitals card shows Operating system, Private IP, Memory, Processor type, Hardware model, MAC, Disk space matching API values. | P0 | E2E: Partial (OS and IP only, assertions not scoped to the card). API: Automated (vitals fields present and typed) |
| D4 | Browse software inventory | `GET /hosts/:id/software?per_page=20&order_key=name&order_direction=asc` returns count and items; `query=<name>` narrows; no-match returns 0. | Software tab loads `/software/inventory`; search sets `?query=` after debounce and request carries it; sort by Name sets `order_key`/`order_direction`. | Open Software, "N items" matches API, search narrows, no-match shows "No items match the current search criteria". | P0 | E2E: Automated (`host-details/software`). API: Automated (`api/host-details`: count/meta/sort/query/no-match/404). Integration: Partial (`?query=` in URL asserted; request params and sort not covered) |
| D5 | Software filters and empty states | `GET /hosts/:id/software?vulnerable=true` returns only items with vulnerabilities. | "Add filters" modal sets vulnerable/type params; button shows "Filtered". Intercept empty -> "No software found". | | P2 | Gap |
| D6 | Refetch host data | `POST /hosts/:id/refetch` returns 200; `GET /hosts/:id` shows `refetch_requested=true` then false. Refetch on unknown id returns 404. | Click Refetch: POST is sent, button changes to "Fetching fresh vitals...this may take a moment" and is disabled, polls `GET /hosts/:id`, returns to "Refetch". Offline host (intercept status) -> button disabled with tooltip. POST failure -> error toast. | Refetch a host and see "Last fetched" update. | P1 | API: Partial (refetch unknown id 404). E2E/Integration: Gap (fixme in header spec) |
| D7 | Delete a host from details | `DELETE /hosts/:id` returns 200; then `GET /hosts/:id` 404. Second delete returns 404. | Cancel and X send no DELETE request. DELETE failure (intercept) -> toast `Host "<name>" could not be deleted.` and stays on page. | Actions -> Delete -> Cancel: host still there. Actions -> Delete -> confirm: toast `Host "<name>" was successfully deleted.`, redirect to `/hosts/manage`, API 404 for id. Note: preview agents re-enroll, so only assert the old id is gone right away. | P0 | E2E: Automated (not run) (`host-details/delete-host`). API: Automated (not run) (`api/hosts-delete`, `@destructive`); unknown id 404 and unauth 401 Automated. Integration: Gap |
| D8 | Return to the filtered list | | Hosts with `?query=x&status=online` -> open host -> "Back to all hosts" restores the same URL. After delete, redirect drops filters (documented behavior). | Filter, open host, go back, filter still applied. | P1 | Gap (fixme) |
| D9 | Navigate tabs | | Tab click pushes `/details`, `/software/inventory`, `/reports`, `/policies`. `/hosts/:id/software` redirects to `/software/inventory`. Controls tab absent on free. | Tabs Details, Software, Reports, Policies visible for Linux host. | P1 | E2E: Automated (tabs render). Integration: Gap |
| D10 | Policies tab | `GET /hosts/:id` returns `policies` and failing count. | Policies tab count matches `failing_policies_count`. | Open Policies: "N policies" or "No policies checked". | P2 | Gap |
| D11 | Reports tab | | | Open Reports: list or "No reports scheduled". "Schedule a report" leaves page (not followed). | P2 | Gap |
| D12 | Labels, Activity, Agent options, Local users cards | `GET /hosts/:id` labels and users arrays; `GET /hosts/:id/activities`. | Label chip link points to `/hosts/manage/labels/:id` ("All Hosts" -> `/hosts/manage`); href only, not followed. | Cards render; local user search with no match shows "No users match your search criteria". | P2 | Gap |
| D13 | Actions menu contents on free | | | Actions shows Delete; Transfer, Lock, Wipe, disk key absent. | P2 | Partial (Delete used in delete spec) |
| D14 | Run script, Live report | | | | - | N/A (out of scope per email) |
| D15 | Lock, Wipe, MDM, Controls, Software Library | | | | - | N/A (MDM / Premium) |

## Cross-cutting

| # | Use case | API cases | Integration cases | E2E cases | Priority | Current status |
|---|---|---|---|---|---|---|
| X1 | Authentication | `POST /login` with valid creds returns token; bad password returns 401. Requests without token return 401. | storageState cookie (`token`) authenticates UI; expired or cleared cookie redirects to `/login`. | Login via UI once in setup. | P0 | E2E: Automated (`setup/auth.setup`). API: Automated (`api/auth`: login, bad creds 401, no/garbage token 401, logout). Integration: Gap |
| X2 | Fresh preview readiness | `GET /hosts` until count stable and software reported. | | | P0 | Partial (global readiness gate; needs stable-count and software checks) |

## Summary by layer

| Layer | Automated now | Main gaps |
|---|---|---|
| API | 46 read-only tests in `tests/api` (`npm run test:api`): auth/401, list/count/sort/pagination, every status value, search fields, host by id + 404s, software inventory, unknown-id delete/refetch 404. Plus 1 `@destructive` delete test (not run yet). | `hosts/report` CSV, bulk `POST /hosts/delete`, refetch happy path, run the destructive delete test, label filters. |
| Integration | Weak. URL sync for default sort, `?query=`, `?status=online` and software `?query=`; deep link `?query=`; document title. | Request-param assertions, Edit columns persist on reload, Export CSV columns match visible set, status deep link, Back to all hosts restores filters, error-state intercepts (500, delete failure, save failure), modal Cancel sends no request. |
| E2E | List and count, open details, search, no-match, Online filter, header, tabs, vitals (OS/IP), software count/search/no-match, delete cancel/confirm (not run yet). | Offline/combined filters, sort, bulk delete, export, refetch, back navigation, fuller vitals. |

## Recommended order for the remaining gaps (2-3h budget)

1. Run the delete spec on preview and fix anything it finds (P0, already written).
2. Done: `tests/api` harness and read-only API suite (`npm run test:api`). Remaining: run `npm run test:api:destructive` once.
3. Offline status filter E2E (empty state) plus status deep link integration. Makes the filter test prove filtering.
4. Bulk delete from Hosts: select, Cancel (no request), confirm (toast, API 404). P0 destructive path not covered yet.
5. Edit columns integration: hide a column, Save, reload, still hidden; reset via API in teardown.
6. Export CSV integration: assert request `columns`, `query` and `status`, and the downloaded header.
7. Back to all hosts keeps filters, then Refetch state change. Both P1 and quick to add.
8. Sort by Host name with an accessible-name check. File the a11y issue if it reproduces.

Leave as documented gaps: label filters (need seeding), pagination (needs 50+ hosts), Add hosts and enroll secrets modals, Policies/Reports/Labels/Activity cards, software filters modal.
