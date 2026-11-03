# Fleet: manual test cases for the Hosts page and Host details page

**Product under test:** Fleet free tier, version **4.94.0**, started with `fleetctl preview`
**Pages in scope:** Hosts (`/hosts/manage`) and Host details (`/hosts/:id/...`, opened by clicking a host)
**Sources of truth:** `fleetdm/fleet` source at tag `fleet-v4.94.0` (see [Appendix A](#appendix-a-source-references)), the running preview UI and API, and the assessment brief
**Status:** Draft v1, 2026-11-03
**Layout:** cases are split per page and category; this README is the single index and holds the shared environment, conventions, coverage matrix, automation subset and open questions.

---

## 1. Introduction

### 1.1 Purpose
These are the manual test cases for the two Fleet pages named in the assessment. They cover:
- happy paths
- negative paths
- edge cases and boundary conditions
- error and empty states
- URL and deep-link state
- role visibility
- destructive flows
- preview-specific quirks such as re-enrollment
- basic accessibility

They are also the backlog for the Playwright suite. See the [AUTO] notes and [§4](#4-recommended-automation-subset).

### 1.2 Environment

| Item | Value |
|---|---|
| Start | `fleetctl preview` (Docker). Stop with `fleetctl preview stop`, using the same binary path. Reset with `fleetctl preview reset`, or stop and start again. |
| Base URL | `http://localhost:1337` |
| API | `http://localhost:1337/api/latest/fleet/...`, sent with `Authorization: Bearer <token>` (from `POST /login`) |
| Credentials | `` / `REDACTED#` (global Admin) |
| License | Free (no Premium). `isPremiumTier=false`, so there are no Fleets (teams). |
| Seed data (fresh preview) | About 8 hosts: the machine running preview (macOS) plus 7 simulated Linux containers (Ubuntu, Debian, CentOS). All are Online and all are "New" (enrolled within 24 h). There are built-in platform labels and 4 built-in "regular" labels (e.g. "Debian-based Linux hosts"). No policies. |
| Browsers | Chromium is the primary browser. Firefox and WebKit are a sanity pass only. |

### 1.3 Scope
**In scope:**
- Everything rendered on `/hosts/manage`, including the `/hosts/manage/labels/:id` variant, its modals, toasts and empty states.
- Everything rendered on `/hosts/:id/{details,software,reports,policies}`, including its modals, such as Delete, Online history and Policy details.

**Out of scope:**
- **Running scripts**, both bulk and per host. Live report is also excluded because it navigates to the live query page.
- **Any page you navigate away to.** Examples: New/Edit label, Custom host vitals, the software title page, Schedule a report, Manage policies, `/hosts/:id/reports/:query_id`, Settings, and the Login page. Login is only a precondition.
- For controls that leave the page, we check only that the control is **present, enabled and has the right target**. We don't test the destination page.

**N/A on free preview:**
- These are still listed, so the gaps are explicit:
  - Premium: Fleets/teams, Transfer, Pending status, Software Library, lock/wipe/unlock, activity automations, patch deadline, scheduled maintenance
  - MDM: Controls tab, MDM columns and filters, Turn off MDM, device-status tags
  - Data volume: pagination and "Select all matching hosts" need 50 or more hosts
- They are marked **N/A (Premium)**, **N/A (MDM)** or **N/A (data)**.

### 1.4 Conventions
- **ID format:** `HST-nnn` for the Hosts page, `DET-nnn` for Host details, `XPG-nnn` for cross-page and environment cases. IDs never change. New cases get the next free number in their section. Gaps in the numbering are intentional.
- **Priority:**
  - **P0** = the core workflow or data trust is broken (release blocker)
  - **P1** = an important feature or a destructive safety net
  - **P2** = polish, edge cases, a11y, or rare paths
- **Type:** Happy, Negative, Edge, Boundary, Error, A11y.
- **Notes tags:**
  - [AUTO] = automation candidate. [AUTO-P0] = in the recommended first subset.
  - [API] = has an API oracle that the UI result should match.
  - [DESTRUCTIVE] = destructive
  - [CAUTION] = preview quirk
  - [BUG?] = suspected bug, to file as an issue
  - QQn = open product question (see [§5](#5-open-product-questions))

**Shared preconditions:**

| Code | Meaning |
|---|---|
| **PC-A** | Fresh preview is up. The readiness check passes: `GET /hosts/count` is stable at ≥ 2 and the simulated Linux hosts have software. |
| **PC-B** | You're logged in as a global **Admin** (``). |
| **PC-C** | PC-A + PC-B, plus a simulated **Linux** host that is **Online** is chosen (never the macOS host that runs preview). Record its `id`, `display_name`, `hostname`, `uuid` and `primary_ip` from `GET /hosts`. |
| **PC-D** | Hidden columns are reset to the defaults: `PATCH /users/:id {settings:{hidden_host_columns:[defaults]}}`. |
| **PC-E** | An **Offline** host exists. Stop one simulated container (`docker ps` → `docker stop <fleet-preview osquery container>`). Wait until its `seen_time` is older than `distributed_interval + 60s`. Restart the container afterwards. |
| **PC-F** | Extra global users exist, created by API: Maintainer, Observer, Observer+. Use them for role cases. |

**How to use:**
- Run the cases in suite order. Destructive cases ([DESTRUCTIVE]) go **last** because deleted preview hosts re-enroll, sometimes with a **new id**.
- After any [DESTRUCTIVE] or environment-altering case, re-run the PC-A readiness check.
- Record Pass, Fail, Blocked or N/A, plus build/date, for each ID.

---

## 2. File index

**Total: 262 cases** — Hosts 150, Host details 104, Cross-page 8.

```
docs/manual-test-cases/
├── README.md            ← this file (index, environment, conventions, coverage, automation subset, open questions)
├── hosts/               ← Hosts page (/hosts/manage), HST-nnn
├── host-details/        ← Host details page (/hosts/:id/...), DET-nnn
└── cross-page.md        ← cross-page and environment, XPG-nnn
```

### 2.1 Hosts page (`/hosts/manage`) — 150 cases

| File | Area | Cases | ID range |
|---|---|---|---|
| [hosts/load-count.md](hosts/load-count.md) | Load, routing and count | 18 | HST-001 – HST-018 |
| [hosts/search.md](hosts/search.md) | Search | 24 | HST-020 – HST-043 |
| [hosts/status-filter.md](hosts/status-filter.md) | Status filter | 14 | HST-050 – HST-063 |
| [hosts/label-filter.md](hosts/label-filter.md) | Label and platform filter | 16 | HST-070 – HST-085 |
| [hosts/sorting.md](hosts/sorting.md) | Sorting | 12 | HST-090 – HST-101 |
| [hosts/edit-columns.md](hosts/edit-columns.md) | Edit columns | 10 | HST-102 – HST-111 |
| [hosts/export.md](hosts/export.md) | Export hosts (CSV) | 8 | HST-120 – HST-127 |
| [hosts/empty-states.md](hosts/empty-states.md) | Empty states and bad page params | 6 | HST-128 – HST-134 |
| [hosts/pagination.md](hosts/pagination.md) | Pagination | 3 | HST-140 – HST-142 |
| [hosts/selection-bulk-delete.md](hosts/selection-bulk-delete.md) | Selection and bulk delete | 18 | HST-150 – HST-167 |
| [hosts/add-hosts-settings.md](hosts/add-hosts-settings.md) | Add hosts, enroll secrets and the gear menu | 9 | HST-168 – HST-176 |
| [hosts/roles-a11y.md](hosts/roles-a11y.md) | Roles and permissions / Accessibility smoke | 9 | HST-180 – HST-194 |
| [hosts/open-details.md](hosts/open-details.md) | Navigation to Host details | 3 | HST-200 – HST-202 |

### 2.2 Host details page (`/hosts/:id`) — 104 cases

| File | Area | Cases | ID range |
|---|---|---|---|
| [host-details/routing-errors.md](host-details/routing-errors.md) | Routing and errors | 15 | DET-001 – DET-015 |
| [host-details/back-navigation.md](host-details/back-navigation.md) | Back to all hosts | 5 | DET-020 – DET-024 |
| [host-details/header-summary.md](host-details/header-summary.md) | Header and summary | 9 | DET-030 – DET-038 |
| [host-details/refetch.md](host-details/refetch.md) | Refetch | 7 | DET-040 – DET-046 |
| [host-details/actions-menu.md](host-details/actions-menu.md) | Actions menu | 7 | DET-050 – DET-056 |
| [host-details/delete.md](host-details/delete.md) | Delete host (single) | 9 | DET-060 – DET-068 |
| [host-details/tabs.md](host-details/tabs.md) | Tabs | 5 | DET-070 – DET-074 |
| [host-details/details-cards.md](host-details/details-cards.md) | Details tab cards | 16 | DET-080 – DET-095 |
| [host-details/software.md](host-details/software.md) | Software tab (Inventory) | 18 | DET-100 – DET-117 |
| [host-details/reports.md](host-details/reports.md) | Reports tab | 4 | DET-120 – DET-123 |
| [host-details/policies.md](host-details/policies.md) | Policies tab | 4 | DET-130 – DET-133 |
| [host-details/roles-a11y.md](host-details/roles-a11y.md) | Roles and accessibility | 5 | DET-140 – DET-144 |

### 2.3 Cross-page and environment — 8 cases

| File | Area | Cases | ID range |
|---|---|---|---|
| [cross-page.md](cross-page.md) | Cross-page and environment | 8 | XPG-001 – XPG-008 |

### 2.4 Where to add new cases

- Add the case to the file for its category, using the next free ID in that category's range (IDs never change or move between files).
- If a new category is needed, create a new file in the matching folder and add a row to the tables above.
- Update the coverage matrix (§3) and, if relevant, the automation subset (§4) and open questions (§5) here.

---

## 3. Coverage matrix and traceability

Requirement areas are taken from the source-backed requirements brief (`fleet-hosts-requirements.md`).

**Legend:**
- Yes = manual cases exist and can run on free preview
- [AUTO-P0] = in the first automation subset
- N/A = listed but can't be run on free preview

### 3.1 Hosts page

| Requirement area | Cases | Free preview |
|---|---|---|
| Header, list, count, default sort, URL normalization, title | HST-001–007, 009, 010, 015–018, 090 | Yes ([AUTO-P0]: 001, 002, 003) |
| Loading / DataError | HST-008, 011, 012 | Yes (mock) |
| Auth guard | HST-013, 014 | Yes |
| Search: fields, debounce, trim, escaping, deep link, combos | HST-020–043 | Yes ([AUTO-P0]: 020, 031, 032, 040). 026 is data-dependent. |
| Status filter: free options, server rules, bad params | HST-050–063 | Yes ([AUTO-P0]: 051, 052 with PC-E). Pending is **N/A (Premium)**. |
| Label / platform filter, pill, label delete | HST-070–085 | Yes |
| Sorting, inverted time columns, invalid params, a11y name | HST-090–101 | Yes |
| Edit columns: persist, cancel, fail, per-user | HST-102–111 | Yes |
| Export CSV | HST-120–127 | Yes |
| Empty states and bad page params | HST-128, 130–134 | Yes ([AUTO-P0]: 128; 131 via mock) |
| Pagination | HST-140–142 | **N/A (data)**: < 50 hosts |
| Selection + bulk delete | HST-150–165 | Yes ([AUTO-P0]: 158). 165 is **N/A (data)**. |
| Transfer / bulk Run script | HST-166, 167 | **N/A (Premium)** / **Out of scope** |
| Add hosts, enroll secrets, gear menu, deep-link modals | HST-168–176 | Yes (Activity automations is Premium; checked disabled) |
| Roles | HST-180–183 | Yes (PC-F) |
| Accessibility | HST-190–194 | Yes |
| Navigation to details | HST-200–202 | Yes ([AUTO-P0]: 200) |
| Fleets dropdown, Fleet/MDM columns, MDM/low-disk/bootstrap filters | Absence checked in HST-001, 004 | **N/A (Premium/MDM)** |

### 3.2 Host details page

| Requirement area | Cases | Free preview |
|---|---|---|
| Routes, redirects, tab URLs, 404/500 | DET-001–015 | Yes ([AUTO-P0]: 005). Controls is **N/A (MDM)**. |
| Back to all hosts (filteredHostsPath) | DET-020–024 | Yes |
| Header + summary, Online history | DET-030–038 | Yes ([AUTO-P0]: 030, 031) |
| Refetch: online, offline, timeout, error | DET-040–046 | Yes (043/044 via mock) |
| Actions menu | DET-050–056 | Yes. Live report and Run script are **out of scope**. Lock/Wipe etc. are **N/A**. |
| Delete: cancel, confirm, toast, redirect, re-enroll, concurrency | DET-060–068 | Yes ([AUTO-P0]: 061, 062) |
| Tabs (free), badge, platform hiding | DET-070–074 | Yes ([AUTO-P0]: 070, 073). 074 is **N/A (data)**. |
| Vitals | DET-080–085 | Yes ([AUTO-P0]: 081) |
| Labels / Activity / User / Agent options / Local users / Certs | DET-086–095 | Yes. Certs are **N/A**. |
| Software inventory | DET-100–117 | Yes ([AUTO-P0]: 100, 102, 103). Library is **N/A (Premium)**. |
| Reports tab | DET-120–123 | Yes (render/empty). Destinations are **out of scope**. |
| Policies tab + modal | DET-130–133 | Yes |
| Roles / a11y | DET-140–144 | Yes |
| Cross-page / environment | XPG-001–008 | Yes ([AUTO-P0]: XPG-001) |

### 3.3 Explicitly not covered

| Item | Reason |
|---|---|
| Running scripts (bulk/host), executing Live report | Out of scope (assessment) |
| Label new/edit, Custom host vitals, software title, schedule report, manage policies, host report pages | Out of scope (navigates away). Only the presence of the entry point is checked. |
| Fleets/teams, Transfer, Pending, Software Library, lock/wipe/unlock, patch deadline, maintenance, activity automations | N/A: Premium |
| Controls tab, MDM columns/filters/modals, Turn off MDM, device-status tags | N/A: needs MDM |
| More than 50 hosts (pagination, "Select all matching") | N/A on stock preview. Could be done with osquery-perf hosts or mocks. |
| Performance/load, security testing | Beyond take-home scope |

---

## 4. Recommended automation subset

This subset gives the most risk coverage per minute and is stable on a fresh preview. The P0s are run in this order (destructive last):

1. **XPG-001**: readiness gate (global setup)
2. **HST-001, HST-002, HST-003**: page loads; count and rows equal the API
3. **HST-020, HST-031 / HST-128, HST-032, HST-040**: search, no-match empty state, clear, deep link
4. **HST-051, HST-052**: Online/Offline filter vs the API. Needs PC-E. Otherwise use HST-053, which still proves that filtering happens.
5. **HST-158**: bulk delete Cancel is non-destructive
6. **HST-200**: name link opens details
7. **DET-005**: unknown id gives a 404
8. **DET-030, DET-031, DET-070, DET-073**: header/status vs the API; tabs render
9. **DET-081**: Vitals vs the API
10. **DET-100, DET-102, DET-103**: software count, search, no-match
11. **DET-061**, then **DET-062** [DESTRUCTIVE]: delete cancel, then confirm (toast, redirect, API 404 right afterwards)

**Next (P1) wave:**
- HST-059 (unknown status)
- HST-091/093 (sort)
- HST-103/104/106 (edit columns)
- HST-120–122 (export)
- HST-159 [DESTRUCTIVE] (bulk delete confirm)
- HST-071/073 (labels)
- HST-181/DET-140 (observer)
- DET-020/022 (back keeps filters)
- DET-040/041 (refetch)
- DET-050 (actions)
- DET-130/131 (policies)

**Mock-only (`page.route`):** HST-011, 107, 126, 131, 162; DET-013, 043, 044, 065, 112.

---

## 5. Open product questions
These are to confirm with Fleet. Confirmed defects get filed as repo issues.

| # | Question | Cases |
|---|---|---|
| Q1 | With filters matching 0 hosts, is "0 hosts" shown or hidden? | HST-010 |
| Q2 | Expected UI when `/hosts/count` fails but `/hosts` succeeds? | HST-012 |
| Q3 | What exactly is the Hosts page document title? | HST-015 |
| Q4 | Should search normalize `’` vs `'`? A straight-quote search doesn't find "Eugene’s MacBook Pro". | HST-036 |
| Q5 | Is there a max search length? What's the behavior for very long queries or URLs? | HST-037 |
| Q6 | Search and filters use `router.replace`. Is it intended that browser Back doesn't undo them? | HST-043 |
| Q7 | Unknown or wrong-case `status` param: silently ignore it, normalize it, or give feedback? | HST-059, 060 |
| Q8 | `?status=pending` on free: ignored or applied? | HST-061 |
| Q9 | Expected UI for a non-existent or non-numeric label id in the path? | HST-079, 080 |
| Q10 | Should built-in "regular" labels (e.g. "Debian-based Linux hosts") be deletable from the pill? | HST-084 |
| Q11 | Confirm the intended visual order for asc/desc on "time ago" columns (the direction is inverted at the API). | HST-093 |
| Q12 | Invalid `order_key`/`order_direction` gives API 422. Should the UI fall back to the default sort? | HST-097, 098, DET-117 |
| Q13 | Sort-button aria-label interpolates a function header. Suspected bug. | HST-100 |
| Q14 | Export with filters that match 0 hosts: hidden, disabled, or header-only CSV? | HST-125 |
| Q15 | `?page=abc` / `?page=-1` give API 400. Should the UI clamp to 0? | HST-133, 134 |
| Q16 | Is the selection kept when search or filters change? Can hidden selected hosts be deleted? | HST-164 |
| Q17 | Modals have no `role="dialog"`/`aria-modal`, and the close X has no name. Known a11y debt? | HST-191, DET-144 |
| Q18 | Non-numeric or overflow host ids: 404 or 500? | DET-006, 007 |
| Q19 | `/hosts/:id/controls` without MDM: redirect or empty? | DET-010 |
| Q20 | After logging in from a deep link, should the user go back to the original host URL? | DET-012 |
| Q21 | After deleting from details, the user goes to unfiltered `/hosts/manage` although `filteredHostsPath` exists. Intended? | DET-063 |
| Q22 | Is there a defined low-disk threshold or color for Disk space? | DET-085 |
| Q23 | Can Observer / Observer+ trigger Refetch? | DET-140 |
| Q24 | Should the Hosts list auto-refresh status, or only on reload or refetch? | XPG-007 |

---

## Appendix A: source references
- **Requirements brief:** `fleet-hosts-requirements.md`, derived from `fleetdm/fleet` at `fleet-v4.94.0`. Main files:
  - `frontend/pages/hosts/ManageHostsPage/*`
  - `frontend/pages/hosts/details/HostDetailsPage/*`
  - `frontend/pages/hosts/details/cards/*`
  - `frontend/pages/hosts/details/modals/HostOnlineHistoryModal`
  - `frontend/pages/hosts/components/DeleteHostModal`
  - `server/datastore/mysql/hosts.go`
  - `server/fleet/hosts.go`
  - `server/service/transport.go`
- **API behavior checked against the running preview** on 2026-11-03:
  - `order_key=bogus` returns 422
  - `page=abc`, `page=-1`, `per_page=0` and `status=bogus` return 400
  - `query=%` and `query=_` return `[]`
  - `GET /hosts/99999` returns 404
- **Seed data** at the time of writing:
  - 8 hosts: 1 macOS, plus 7 Linux (Ubuntu ×3, Debian ×2, CentOS ×2), all online
  - built-in platform labels, plus 4 regular labels (Apple Silicon macOS, ARM-based Windows, Debian-based Linux, x86-based Windows)
