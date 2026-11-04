# Coverage matrix

Legend: automated · planned (SHOULD) · nice-to-have · out of scope / not testable on free preview

Read-only UI specs below run in Chrome, Firefox, and Safari (`npm test` or `npm run test:ui-only`). Smoke is `npm run test:ui:smoke`. Regression is `npm run test:ui:regression`. The one Hosts and host-details journey is `npm run test:ui:e2e`. Delete stays on Chrome only (`npm run test:destructive`).

| Area | Feature | Status | Spec | Why |
|---|---|---|---|---|
| Hosts | List renders, count + names match `GET /hosts` | automated | ui/smoke/hosts/hosts-list | Core: if this breaks nobody sees their fleet |
| Hosts | Operating system, status, and disk space match `GET /hosts` | automated | ui/regression/hosts/table-cells | The other facts on the row |
| Hosts | Host name link opens details | automated | ui/smoke/hosts/hosts-list | Only entry point to details |
| Hosts | Search + `?query=` sync | automated | ui/smoke/hosts/search | Primary lookup path |
| Hosts | No-match empty state and `?query=` deep link | automated | ui/regression/hosts/search | Recovery path and shared link |
| Hosts | Status filter (Online) vs API | automated | ui/smoke/hosts/status-filter | Triage |
| Hosts | Offline / Missing / New filters | automated | ui/regression/hosts/status-filter | Matches API count / empty state |
| Hosts | Sort by column | automated | ui/smoke/hosts/sort | Header click vs API |
| Hosts | Sort deep link | automated | ui/regression/hosts/sort | hostname desc vs API |
| Hosts | Edit columns persists (server-side) | automated | ui/smoke/hosts/edit-columns | UI + hidden_host_columns |
| Hosts | Export CSV matches API report | automated | ui/smoke/hosts/export | Download vs GET /hosts/report |
| Hosts | Search clear, whitespace, `%` / `_`, prefix, UUID, IP, serial, computer name, case | automated | ui/regression/hosts/search | Debounce and URL, not only the API |
| Hosts | Search plus Online | automated | ui/regression/hosts/search | Combined filter |
| Hosts | Search plus Linux | automated | ui/regression/hosts/search | Names match `GET /labels/:id/hosts?query=` |
| Hosts | All hosts clears status; Enrolled; bad `?status=` | automated | ui/regression/hosts/status-filter | Free-tier statuses and a bad link |
| Hosts | Each sortable header, including Operating system; time-ago direction flip; Status / User email / CPU not sortable | automated | ui/regression/hosts/sort | Hidden columns shown, then the setting is restored |
| Hosts | Edit columns Cancel, Escape, show Hostname; Host is not in the list | automated | ui/regression/hosts/edit-columns | Dismiss must not save. Host cannot be hidden |
| Hosts | Add hosts Close, Escape, empty-state Add hosts, platform tabs, secret text matches GET | automated | ui/regression/hosts/add-hosts | No secret write, no clipboard |
| Hosts | macOS / Windows / ChromeOS, Linux again clears the label, Linux+Online, Linux miss, unknown label id | automated | ui/regression/hosts/label-filter | Platform menu has no All hosts row |
| Hosts | iOS, iPadOS, Android, builtin labels; Filter by label name | automated | ui/regression/hosts/label-filter | Empty platforms included. Add label is not clicked |
| Hosts | Edit label control | out of scope | — | Next page (label editor). Not clicked |
| Hosts | Add label | out of scope | — | Next page (label editor). Not clicked |
| Hosts | Export while Online; export while Linux; Export hidden on a no-match search | automated | ui/regression/hosts/export | Filtered file. A miss removes the export button |
| Hosts | Row checkbox, header checkbox, mixed state, selection count, Clear selection; Delete Cancel and Escape | automated | ui/regression/hosts/bulk-select | Run script stays enabled and is not clicked |
| Hosts | Hosts page settings → Enroll secrets value matches GET, then Done; Activity automations disabled | automated | ui/regression/hosts/page-settings | Add secret is not clicked |
| Hosts | Custom host vitals | out of scope | — | Next page (`/controls/variables`). Not clicked |
| Hosts | Bulk select → Delete confirm | out of scope | — | No undelete. Cancel and Escape are covered |
| Hosts | Label filter | automated | ui/smoke/hosts/label-filter | Platforms Linux → /labels/:id |
| Hosts | Pagination / select all matching | out of scope | — | Needs ≥50 hosts |
| Hosts | Transfer / Pending / Fleets column | out of scope | — | Premium |
| Hosts | Run script (batch) | out of scope | — | Out of scope |
| Hosts | Add hosts / enroll secrets | automated | ui/smoke/hosts/add-hosts | Modal platforms + install command; secret via API |
| Details | Header name/status/title match API | automated | ui/smoke/host-details/header | Data trust |
| Details | Tabs set the URL and aria-selected; each tab URL; bad tab path | automated | ui/regression/host-details/header | Shared tab links |
| Details | Back with no filter; Back keeps `?query=` | automated | ui/regression/host-details/header | Filter memory besides Online |
| Details | Actions lists Delete; Escape closes it | automated | ui/regression/host-details/header | Other Actions items are not clicked |
| Details | Refetch disables while fetching | automated | ui/regression/host-details/header | Second click waits |
| Details | Remaining vitals vs GET /hosts/:id | automated | ui/regression/host-details/vitals | Beyond OS and primary IP |
| Details | Label chips, user row, activity feeds | automated | ui/regression/host-details/side-cards | Headings were the smoke check |
| Details | Agent options, when the card is present | automated | ui/regression/host-details/side-cards | Not edited |
| Details | Software search clear; Name sort; software link not opened | automated | ui/regression/host-details/software | Next page is the software title |
| Details | `/hosts/abc` and `/hosts/0` do not render a host | automated | ui/regression/host-details/not-found | 404 copy when Fleet shows it; otherwise no host header |
| Details | Vitals (OS, IP) match API | automated | ui/smoke/host-details/vitals | Data trust |
| Details | Software inventory count + search | automated | ui/smoke/host-details/software | Headline feature |
| Details | Software no-match empty state | automated | ui/regression/host-details/software | Recovery |
| Details | Delete: cancel safe, confirm deletes (API 404) | automated | ui/destructive/host-details/delete-host | Destructive. Not part of the e2e journey |
| Details | Refetch | automated | ui/regression/host-details/header | Button → Fetching fresh vitals |
| Details | Back to all hosts keeps the Online filter | automated | ui/e2e/hosts-and-details | One journey: Online filter, Details summary, dismiss Delete, Policies, Reports, Software, Back, Sign out |
| Details | Policies tab content | automated | ui/smoke/host-details/policies-reports | Empty-state copy mounts |
| Details | Reports tab content | automated | ui/regression/host-details/policies-reports | Empty-state copy mounts |
| Details | Activity / Labels / Users cards | automated | ui/smoke/host-details/side-cards | Details side cards |
| Details | List opens the host whose header matches the API | automated | ui/e2e/hosts-and-details | Name, title, and status are checked on the one journey. The bare name click is smoke hosts-list |
| Details | Search opens the matching host | automated | ui/regression/host-details/header | Search, open, and Back. Not a separate e2e trip |
| Details | Software tab count after opening the host | automated | ui/e2e/hosts-and-details | Count on the one journey, after Policies and Reports. Search and sort stay in regression |
| Details | Bad host id → 404 page | automated | ui/regression/host-details/not-found | Fleet 404 page |
| Details | Query, Run script, Transfer, Lock, Unlock, Wipe, disk encryption, MDM | out of scope | — | Leave the page, run a script, or need MDM. Named in Actions and not clicked |
| Details | Populated Policies or Reports tables | out of scope | — | Preview has no policies and pack_stats is null. Seeding leaves these pages |
| Details | Software Library / install | out of scope | — | Premium |
| Hosts | Pending hosts, Fleet column, MDM columns | out of scope | — | Premium or hidden on free tier |
| Hosts | Top nav and account menu | out of scope | — | Leave Hosts. The e2e journey clicks Sign out only |

## API (`tests/api`, `npm run test:api`)

| Area | Check | Status | Spec |
|---|---|---|---|
| Auth | Login success, token works on `/me` | automated | api/auth |
| Auth | Wrong password / unknown user / empty creds → 401 same message | automated | api/auth |
| Auth | No token → 401 on `/hosts`, `/hosts/count`, `/hosts/:id`, `/hosts/:id/software`, `/me`, `/labels`, `/labels/:id/hosts`, `/spec/enroll_secret`, `/users`, `PATCH /users/:id`; garbage token 401; unauth DELETE and `POST /hosts/delete` 401 and host survives; token dead after logout | automated | api/auth |
| Hosts | List shape, unique ids, count == list length; `device_mapping=true` keeps the same ids | automated | api/hosts |
| Hosts | Sort asc/desc reverse, per_page/page, page past end empty | automated | api/hosts |
| Hosts | Invalid `status` 400, invalid `order_key` 422 | automated | api/hosts |
| Hosts | Each status (online/offline/new/missing/mia): subset of all, count == list; online/offline partition | automated | api/hosts |
| Hosts | Search: hostname, prefix, uuid, IP, serial, computer_name, case-insensitive, no-match 0, whitespace = all, `%` literal, query+status | automated | api/hosts |
| Details | `GET /hosts/:id` fields match list, vitals typed, "All Hosts" label, `policies` + failing count, `pack_stats` (Reports tab, null or array); `exclude_software` | automated | api/host-details |
| Details | `GET /hosts/:id/activities` and `/activities/upcoming` lists; unknown host 404 | automated | api/host-details |
| Details | Unknown id / `abc` / `0` → 404 | automated | api/host-details |
| Details | Software: count/items/meta, sorted, query narrows, no-match, unknown host 404 | automated | api/host-details |
| Details | DELETE / refetch unknown id → 404 | automated | api/host-details |
| Details | DELETE host 200 → GET 404 → second DELETE 404 | planned (`test.fixme`) | api/hosts-delete — no undelete; re-enrollment is a new id |
| Hosts | `/hosts/report` CSV: columns, row==list, status/query filters, no-match header-only, missing format 400, bad format 415, unknown column 400 | automated | api/hosts |
| Hosts | Labels: `GET /labels`, `GET /labels/:id/hosts` (All Linux/macOS), +status/query, count via `label_id`; unknown id 404 and its hosts route empty 200; `/hosts?label_id=` footgun | automated | api/hosts |
| Hosts | Edit columns: `PATCH` `hidden_host_columns` persists (read via `GET /users`) | automated | api/hosts |
| Hosts | Enroll secrets: `GET /spec/enroll_secret` has ≥1 secret | automated | api/hosts |
| Hosts | Extra sorts (`hostname`,`seen_time`,`platform`,`os_version`,`issues`); `status` → 422; search `_` literal; report + `label_id` | automated | api/hosts |
| Hosts | `DELETE /hosts/:id` and `POST /hosts/delete` (one id, empty body, both ids and filters, empty ids, unknown id, no-match filter) | planned (`test.fixme`) | api/hosts-delete — Fleet has no undelete. Preview re-enrollment creates a new id. Unauthenticated 401s still run. |
| Details | Refetch happy path | automated | api/host-details |
