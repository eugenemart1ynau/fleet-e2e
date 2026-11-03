# Fleet: manual test cases for the Hosts page and Host details page

**Product under test:** Fleet free tier, version **4.94.0**, started with `fleetctl preview`
**Pages in scope:** Hosts (`/hosts/manage`) and Host details (`/hosts/:id/...`, opened by clicking a host)
**Sources of truth:** `fleetdm/fleet` source at tag `fleet-v4.94.0` (see [Appendix A](#appendix-a-source-references)), the running preview UI and API, and the assessment brief
**Status:** Draft v1, 2026-11-03

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

They are also the backlog for the Playwright suite. See the 🤖 notes and [§6](#6-recommended-automation-subset).

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
  - 🤖 = automation candidate. 🤖P0 = in the recommended first subset.
  - 🔌 = has an API oracle that the UI result should match.
  - 💥 = destructive
  - ⚠️ = preview quirk
  - 🐞 = suspected bug, to file as an issue
  - ❓Qn = open product question (see [§7](#7-open-product-questions))

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
- Run the cases in suite order. Destructive cases (💥) go **last** because deleted preview hosts re-enroll, sometimes with a **new id**.
- After any 💥 or environment-altering case, re-run the PC-A readiness check.
- Record Pass, Fail, Blocked or N/A, plus build/date, for each ID.

---

## 2. Hosts page: `/hosts/manage`

### 2.1 Load, routing and count

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-001 | Page loads with header, controls and table | P0 | Happy | PC-A, PC-B | 1. Open `/hosts/manage` | H1 "Hosts" is shown. You see the search box, "Filter by status", "Filter by platform or label", Edit columns, Export hosts, Add hosts, the gear menu, a count and a table. There is no error toast and no Fleets dropdown. | 🤖P0 |
| HST-002 | Host count text matches the API | P0 | Happy | PC-A, PC-B | 1. Open the page<br>2. Compare `.table-count` with `GET /hosts/count` | The text reads "N hosts" and N equals the API `count`. | 🤖P0 🔌 |
| HST-003 | Rows match the API host list | P0 | Happy | PC-A, PC-B | 1. Open the page<br>2. Compare the Host column with `GET /hosts?order_key=display_name&order_direction=asc&per_page=50` | Same names, in the same order. Row count = API length = count. | 🤖P0 🔌 |
| HST-004 | Default columns on free | P1 | Happy | PC-D | 1. Open the page<br>2. Read the headers | Selection checkbox, Host, Operating system, Last fetched, Disk space available, Status, Agent, Last restarted. Fleet, MDM status and MDM server URL are **absent**. | 🤖 |
| HST-005 | One host's cells match the API | P0 | Happy | PC-C | 1. Find the PC-C row<br>2. Compare it with `GET /hosts/:id` | OS = `os_version`. Status = capitalized `status`. Agent = `orbit_version`/`osquery_version`. Disk = `gigs_disk_space_available`. | 🤖 🔌 |
| HST-006 | URL is normalized with default params | P1 | Happy | PC-B | 1. Open `/hosts/manage` with no params | The URL is replaced (no new history entry) with `?page=0&order_key=display_name&order_direction=asc`. There's no `fleet_id`. | 🤖 |
| HST-007 | `/hosts` redirects | P1 | Happy | PC-B | 1. Open `/hosts` | You land on `/hosts/manage` with the default params. | 🤖 |
| HST-008 | Loading spinner, then the table | P2 | Happy | PC-B, throttled network | 1. Load the page with DevTools "Slow 3G" | A spinner shows while `/hosts` and `/hosts/count` are pending. Then the table renders. There's no layout crash. | |
| HST-009 | Singular count wording | P2 | Boundary | PC-C | 1. Search for a unique hostname | The count reads "1 host" (singular). | 🤖 |
| HST-010 | Zero count wording with filters | P1 | Boundary | PC-B | 1. Search for `zzz-no-match-zzz` | The count reads "0 hosts" (or is hidden ❓). The filtered empty state is shown (HST-128). | 🤖 ❓Q1 |
| HST-011 | Hosts API fails, so DataError is shown | P1 | Error | PC-B; mock `GET …/fleet/hosts?*` with a 500 | 1. Reload the page | The DataError component replaces the table. The page doesn't crash. Add hosts is hidden. | 🤖 (route mock) |
| HST-012 | Count API fails, list API succeeds | P2 | Error | PC-B; mock `/hosts/count` with a 500 | 1. Reload | Graceful result: the count is hidden or an error is shown, and the page doesn't crash. Record the behavior. | ❓Q2 |
| HST-013 | Unauthenticated access | P0 | Negative | Logged out (cookie cleared) | 1. Open `/hosts/manage` | You're redirected to `/login`. No host data renders. | 🤖 |
| HST-014 | Invalid or expired token mid-session | P1 | Negative | PC-B | 1. Change the `token` cookie to garbage<br>2. Reload | You're redirected to login (the API returns 401). No data is shown. | 🤖 |
| HST-015 | Browser tab title | P2 | Happy | PC-B | 1. Read the document title | It contains "Hosts" and "Fleet". | ❓Q3 |
| HST-016 | Relative-time cells | P2 | Happy | PC-C | 1. Read Last fetched / Last restarted | Relative text ("x minutes ago") consistent with `detail_updated_at`/`last_restarted_at`. A null value shows "---"/"Never" and never "Invalid date". | |
| HST-017 | Long names and special characters | P2 | Edge | macOS host `Eugene’s MacBook Pro (2)` | 1. View the row | The name renders exactly (curly quote and parentheses), with no HTML-escaping artifacts. Long text truncates or wraps without breaking the layout. | |
| HST-018 | Host link "last seen" tooltip | P2 | Happy | PC-C | 1. Hover the host name | The `title` attribute shows "last seen" text. | |

### 2.2 Search

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-020 | Search by exact hostname | P0 | Happy | PC-C | 1. Type the PC-C `hostname` in "Search name, user email, hostname, UUID, serial number, or IP address" | After about 500 ms only that host is listed. Count = 1. The URL has `query=<hostname>&page=0`. | 🤖P0 🔌 |
| HST-021 | Partial (substring) match | P0 | Happy | PC-A | 1. Type the first 3 characters of a hostname | Every host containing the substring in any searchable field is listed. The result equals `GET /hosts?query=`. | 🤖 🔌 |
| HST-022 | Search by UUID | P1 | Happy | PC-C | 1. Search for the full `uuid` | The PC-C host is listed. | 🤖 |
| HST-023 | Search by IP (full and partial) | P1 | Happy | PC-C | 1. Search for the full `primary_ip`<br>2. Search for its first octets (e.g. `172.`) | Step 1 gives exactly one host. Step 2 gives all hosts with that prefix, matching the API. | 🤖 🔌 |
| HST-024 | Search by serial number | P1 | Happy | macOS host (has a serial) | 1. Search for the serial | The macOS host is listed. | |
| HST-025 | Query with inner spaces | P1 | Edge | macOS host | 1. Search for `MacBook Pro` | The macOS host is listed (the inner space is kept). | |
| HST-026 | Search by user email | P2 | Happy | A host with `host_emails`/device mapping | 1. Search for the email | The host is listed. Mark **N/A (data)** if no host has an email. | ⚠️ |
| HST-027 | Case-insensitive | P1 | Edge | PC-C | 1. Search for the hostname in UPPERCASE | Same result as lowercase. | 🤖 |
| HST-028 | Leading and trailing whitespace is trimmed | P1 | Edge | PC-C | 1. Search for `"  <hostname>  "` | Same result as the trimmed value. The URL `query` is trimmed. | 🤖 |
| HST-029 | Whitespace-only query | P1 | Boundary | PC-A | 1. Type only spaces | It's treated as an empty query, so all hosts are shown. There's no `query` param (or it's empty). No empty state. | 🤖 |
| HST-030 | Debounce | P2 | Edge | PC-A | 1. Watch the network<br>2. Type 8 characters quickly | About one `/hosts` request fires, roughly 500 ms after the last keystroke (not one per keystroke). | 🤖 |
| HST-031 | No match shows the empty state | P0 | Negative | PC-A | 1. Search for `zzz-no-match-zzz` | "No hosts match your filters" / "Recently enrolled hosts will appear here after their first check-in." plus Add hosts. The search and filter controls stay **enabled**. | 🤖P0 |
| HST-032 | Clear search restores the list | P0 | Happy | after HST-031 | 1. Clear the input | The full list and count come back. `query` is removed from the URL. | 🤖P0 |
| HST-033 | `%` is literal, not a wildcard | P1 | Edge | PC-A | 1. Search for `%` | **0 results** (matches the API: `query=%25` returns `[]`). | 🤖 🔌 |
| HST-034 | `_` is literal, not a wildcard | P1 | Edge | PC-A | 1. Search for `_` | 0 results unless a field contains a literal `_`. Matches the API. | 🤖 🔌 |
| HST-035 | Injection-like and markup input | P1 | Negative | PC-A | 1. Search for `' OR 1=1 --`<br>2. Then `<script>alert(1)</script>`<br>3. Then `"` and `\` | No server error and no script execution. The no-match empty state is shown. The input shows the literal text. | 🤖 |
| HST-036 | Unicode and curly-quote input | P2 | Edge | macOS host `Eugene’s …` | 1. Search for `Eugene’s` (curly)<br>2. Search for `Eugene's` (straight) | The curly version matches. The straight version gives 0 results (literal LIKE). Record this as a UX question. | ❓Q4 |
| HST-037 | Very long query | P2 | Boundary | PC-A | 1. Paste 1,000+ characters | No crash and no 414 error page. The empty state is shown, or a graceful error. | ❓Q5 |
| HST-038 | Single-character query | P2 | Boundary | PC-A | 1. Search for `a` | The search runs (no minimum length) and matches the API. | 🔌 |
| HST-039 | Search resets the page to 0 | P2 | Boundary | PC-A | 1. Open `?page=1`<br>2. Type a search | The URL has `page=0`. | |
| HST-040 | Deep link `?query=` | P0 | Happy | PC-C | 1. Open `/hosts/manage?query=<hostname>` | The input is pre-filled, the list is filtered and the count is correct. | 🤖P0 |
| HST-041 | Search + status | P1 | Happy | PC-A | 1. Search a substring<br>2. Choose Online hosts | Results are the intersection. The URL has `query` and `status`. Matches the API with both params. | 🤖 🔌 |
| HST-042 | Search + label | P1 | Happy | PC-A | 1. Choose the label "Debian-based Linux hosts"<br>2. Search a substring | Results are the intersection (`/labels/:id/hosts?query=`). | 🤖 🔌 |
| HST-043 | Browser Back after a search | P2 | Edge | PC-A | 1. Search for X<br>2. Press browser Back | Record the behavior. The page uses `router.replace`, so Back may leave the page instead of undoing the search. | ❓Q6 |

### 2.3 Status filter

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-050 | Status options on free | P1 | Happy | PC-B | 1. Open "Filter by status" | All hosts, Online hosts, Offline hosts, Missing hosts, New hosts, Enrolled hosts, each with help text. **No** "Pending hosts". | 🤖 |
| HST-051 | Online filter excludes offline hosts | P0 | Happy | PC-E | 1. Choose "Online hosts" | URL `status=online&page=0`. Every Status cell reads "Online". Count = `GET /hosts/count?status=online`. The offline host is **absent**. | 🤖P0 🔌 |
| HST-052 | Offline filter | P0 | Happy | PC-E | 1. Choose "Offline hosts" | Only the stopped host is listed, with Status "Offline". Count matches the API. | 🤖P0 🔌 ⚠️ needs PC-E |
| HST-053 | Offline filter when none are offline | P1 | Negative | PC-A (all online) | 1. Choose "Offline hosts" | Empty state "No hosts match your filters". | 🤖 |
| HST-054 | Missing filter on a fresh preview | P1 | Boundary | PC-A | 1. Choose "Missing hosts" | Empty state (no host has been unseen for 30+ days). Matches the API. | 🤖 🔌 |
| HST-055 | New filter | P1 | Happy | PC-A (enrolled < 24 h) | 1. Choose "New hosts" | Every host is listed, matching `status=new`. | 🤖 🔌 ⚠️ fresh preview only |
| HST-056 | Enrolled filter | P1 | Happy | PC-A | 1. Choose "Enrolled hosts" | All hosts (no MDM-pending on free). Count = total. | 🤖 🔌 |
| HST-057 | Back to All hosts | P1 | Happy | after HST-051 | 1. Choose "All hosts" | `status` is removed from the URL. Full list. | 🤖 |
| HST-058 | Deep link `?status=online` | P1 | Happy | PC-A | 1. Open `/hosts/manage?status=online` | The select shows "Online hosts" and the list is filtered. | 🤖 |
| HST-059 | Unknown status in the URL | P1 | Negative | PC-B | 1. Open `?status=bogus` | Ignored (`isAcceptableStatus`). All hosts are shown, the select reads "All hosts" and there's **no** error state. The API would reject it (400 "Invalid status: bogus"), so the UI must not forward it. | 🤖 ❓Q7 |
| HST-060 | Wrong-case status | P2 | Edge | PC-B | 1. Open `?status=ONLINE` | Either ignored or normalized, but never an error. Record which. | ❓Q7 |
| HST-061 | `?status=pending` on free | P2 | Negative | PC-B | 1. Open `?status=pending` | No Pending option is shown. Record whether the list is filtered, ignored, or errors. | N/A (Premium) ❓Q8 |
| HST-062 | Online/offline threshold | P2 | Boundary | PC-E | 1. Stop a container<br>2. Check at T < interval + 60 s, then T > interval + 60 s | "Online" before the threshold, "Offline" after. | ⚠️ timing; manual only |
| HST-063 | Option help text | P2 | Happy | PC-B | 1. Read each option | Each option has its description (e.g. Online: "Hosts that have recently checked into Fleet."). | |

### 2.4 Label and platform filter

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-070 | Dropdown groups | P1 | Happy | PC-B | 1. Open "Filter by platform or label" | A "Platforms" group: built-in platform labels **excluding** All Hosts, Red Hat Linux, CentOS Linux and Ubuntu Linux. A "Labels" group: regular labels. There's an in-menu "Filter by label name" search and an "Add label" button. | 🤖 |
| HST-071 | Platform filter: All Linux | P1 | Happy | PC-A | 1. Choose "All Linux" | URL `/hosts/manage/labels/<id>`. Only Linux hosts are listed. Count = `GET /labels/<id>/hosts`. **No pill** is shown. | 🤖 🔌 |
| HST-072 | Platform filter: macOS | P1 | Happy | PC-A | 1. Choose "macOS" | Only the macOS host is listed. | 🤖 |
| HST-073 | Regular label shows a pill | P1 | Happy | PC-A | 1. Choose "Debian-based Linux hosts" | The list is filtered. A pill is shown with `role=status`, aria-label "hosts filtered by Debian-based Linux hosts", and a "Remove … filter" button. | 🤖 |
| HST-074 | Remove the pill | P1 | Happy | after HST-073 | 1. Click the pill's remove button | Back to `/hosts/manage`, `page=0`. Full list. | 🤖 |
| HST-075 | Label with 0 hosts | P1 | Boundary | PC-B | 1. Choose "MS Windows" | Filtered empty state. Controls stay enabled. | 🤖 |
| HST-076 | In-menu label search | P2 | Happy/Negative | PC-B | 1. Type "Debian"<br>2. Type "zzz" | Step 1 filters the options. Step 2 shows "No matching labels". | |
| HST-077 | "Add label" control | P2 | Happy | PC-B | 1. Check that it's present | Visible (aria-label "Add label"). **Don't follow it.** | Out of scope target |
| HST-078 | Deep link to a label path | P1 | Happy | PC-B | 1. Open `/hosts/manage/labels/<regular id>` | The filter is applied, the select shows the label and the pill is shown. | 🤖 |
| HST-079 | Non-existent label id | P1 | Negative | PC-B | 1. Open `/hosts/manage/labels/999999` | Graceful handling (error state or redirect). No crash or blank page. Record which. | ❓Q9 |
| HST-080 | Non-numeric label id | P2 | Negative | PC-B | 1. Open `/hosts/manage/labels/abc` | Graceful, no crash. | ❓Q9 |
| HST-081 | Label + status + search | P1 | Happy | PC-A | 1. Choose a label, Online, and a substring search | Results are the intersection. The URL has the label path plus `status` and `query`. Matches the API. | 🤖 🔌 |
| HST-082 | Pill Edit/Delete icons (admin) | P2 | Happy | after HST-073 | 1. Inspect the pill | "Edit label" and "Delete label" are visible for a global admin. Edit isn't followed (out of scope). | |
| HST-083 | Delete label: Cancel | P2 | Negative | after HST-073 | 1. Delete label<br>2. Cancel | The modal closes, the label still exists (`GET /labels`) and the filter stays. | |
| HST-084 | Delete label: Confirm | P2 | Happy | A throwaway custom label created by API | 1. Filter by it<br>2. Delete label<br>3. Confirm | Toast "Successfully deleted label." The list is unfiltered and `GET /labels` no longer has it. | 💥 ❓Q10 |
| HST-085 | Choosing a label strips incompatible params | P2 | Edge | PC-B | 1. Open `?policy_id=1&software_id=1`<br>2. Choose a label | The policy, software and similar params are removed from the URL. | |

### 2.5 Sorting

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-090 | Default sort: Host ascending | P1 | Happy | PC-A | 1. Load the page | Rows are ordered by `display_name` ascending, equal to the API order. | 🤖 🔌 |
| HST-091 | Host descending | P1 | Happy | PC-A | 1. Click the Host header | URL `order_direction=desc`. Rows are reversed and match the API. | 🤖 🔌 |
| HST-092 | Sort by Operating system | P1 | Happy | PC-A | 1. Click the OS header twice | `order_key=os_version`, asc then desc. Matches the API. | 🤖 🔌 |
| HST-093 | "Time ago" column direction | P1 | Edge | PC-A | 1. Sort Last fetched asc, then desc | The direction is inverted at the API boundary, so the visible order reads naturally (verify against the relative-time text). | 🤖 ❓Q11 |
| HST-094 | Status isn't sortable | P2 | Negative | PC-A | 1. Click the Status header | No sort button and no URL change. | |
| HST-095 | Disk / Agent / Last restarted sort | P2 | Happy | PC-A | 1. Sort each one | `order_key` updates. Matches the API. | |
| HST-096 | Deep link sort | P1 | Happy | PC-A | 1. Open `?order_key=os_version&order_direction=desc` | The table is sorted accordingly and the header shows the sort indicator. | 🤖 |
| HST-097 | Invalid `order_key` | P1 | Negative | PC-B | 1. Open `?order_key=bogus&order_direction=asc` | The API returns **422** "invalid order_key". The UI should fall back to the default sort or show DataError. Never a blank or crashed page. | 🤖 ❓Q12 |
| HST-098 | Invalid `order_direction` | P2 | Negative | PC-B | 1. Open `?order_key=display_name&order_direction=sideways` | Graceful (default direction or an error state). | ❓Q12 |
| HST-099 | Sort survives search and filter | P2 | Happy | PC-A | 1. Sort OS desc<br>2. Search<br>3. Choose Online | The sort is kept in the URL and in the results. | 🤖 |
| HST-100 | Sort button accessible name | P2 | A11y | PC-A | 1. Inspect the a11y tree of the sort buttons | Expected: "Sort by Host ascending" etc. Suspected: "Sort by [object Object]" or function text, because the header is a function. | 🐞 ❓Q13 |
| HST-101 | Issues sorts descending first | P2 | Edge | Issues column shown | 1. Click the Issues header once | `order_direction=desc` on the first click. | |

### 2.6 Edit columns

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-102 | Modal reflects the current state | P1 | Happy | PC-D | 1. Click "Edit columns" | "Edit columns" / "Choose which columns you see:". One checkbox per column (aria-label = title), checked = visible. Host isn't listed. Fleet and MDM aren't listed. Save and Cancel buttons. | 🤖 |
| HST-103 | Hide a column + Save | P1 | Happy | PC-D | 1. Uncheck "Agent"<br>2. Save | The modal closes and Agent is gone. `PATCH /users/:id` sends `hidden_host_columns` including it. No toast. | 🤖 🔌 |
| HST-104 | Persists after reload and re-login | P1 | Happy | after HST-103 | 1. Reload<br>2. Log out and back in | Still hidden. `GET /me` `settings.hidden_host_columns` matches. | 🤖 🔌 |
| HST-105 | Show a default-hidden column | P1 | Happy | PC-D | 1. Check "Hostname" (or Serial number)<br>2. Save | The column appears and its values match the API. | 🤖 🔌 |
| HST-106 | Cancel / X / Esc discards changes | P1 | Negative | PC-D | 1. Toggle checkboxes<br>2. Cancel (repeat with X and Esc) | The table is unchanged and there's no PATCH. Reopening shows the original state. | 🤖 |
| HST-107 | Save fails | P2 | Error | Mock PATCH `/users/:id` with a 500 | 1. Uncheck a column<br>2. Save | Toast "Couldn't save column settings. Please try again." The modal **stays open** and the table is unchanged. | 🤖 (route mock) |
| HST-108 | Hide every hideable column | P2 | Boundary | PC-D | 1. Uncheck all<br>2. Save | Only selection + Host remain. The Host link still works. | |
| HST-109 | Show every column | P2 | Boundary | PC-D | 1. Check all<br>2. Save | All free columns render (horizontal scroll) with no misaligned cells. | |
| HST-110 | Settings are per user | P2 | Edge | PC-F | 1. As admin, hide Agent<br>2. Log in as Maintainer | The Maintainer still sees Agent. | |
| HST-111 | Disabled on a truly empty instance | P2 | Boundary | 0 hosts (see HST-131) | 1. Load the page | Edit columns is disabled. | ⚠️ |

### 2.7 Export hosts (CSV)

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-120 | Export downloads a CSV | P1 | Happy | PC-A, PC-D | 1. Click "Export hosts" | A file named `Hosts YYYY-MM-DD.csv` (today) downloads. The request is `GET /hosts/report?format=csv&columns=<visible ids>…`. | 🤖 |
| HST-121 | CSV columns and rows | P1 | Happy | after HST-120 | 1. Open the CSV | Header = the visible columns. Agent becomes `orbit_version,osquery_version`. No `selection` column. Rows = host count. Values match the API. | 🤖 🔌 |
| HST-122 | Export respects search, status and sort | P1 | Happy | PC-A | 1. Search + Online + OS desc<br>2. Export | Only the matching hosts, in that order. The request carries `query`, `status` and `order_*`. | 🤖 |
| HST-123 | Export respects the label | P2 | Happy | PC-A | 1. Filter All Linux<br>2. Export | Linux rows only (`label_id`). | 🤖 |
| HST-124 | Export respects hidden columns | P2 | Happy | after HST-103 | 1. Export | No Agent columns. | 🤖 |
| HST-125 | Export with zero matches | P2 | Boundary | PC-A | 1. Search with no match<br>2. Check/use Export | Record whether it's hidden, disabled, or gives a header-only CSV. | ❓Q14 |
| HST-126 | Export fails | P2 | Error | Mock `/hosts/report` with a 500 | 1. Export | Toast "Could not export hosts. Please try again." No file. | 🤖 (route mock) |
| HST-127 | CSV encoding and escaping | P2 | Edge | macOS host name with `’` and `(2)` | 1. Export<br>2. Open in a text editor | UTF-8 is intact. Fields with commas or quotes are quoted. | |

### 2.8 Empty states and bad page params

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-128 | Filtered empty state | P0 | Negative | PC-A | 1. Search with no match (or choose Missing) | `.empty-state` "No hosts match your filters" / "Recently enrolled hosts will appear here after their first check-in." plus Add hosts. Search, status, label and Edit columns stay enabled. | 🤖P0 |
| HST-130 | Add hosts from the empty state | P2 | Happy | after HST-128 | 1. Click Add hosts | The Add hosts modal opens (HST-168). | |
| HST-131 | Truly empty instance | P2 | Boundary | 0 hosts: mock `/hosts` and `/hosts/count` as empty (or delete all and stop the agents) | 1. Load with no params | "No hosts" / "Fleet refers to computers, servers, and mobile devices as hosts. Add a host to start seeing data." plus Add hosts. Search, status, label and Edit columns are **disabled**, and Export is disabled. | 🤖 (route mock) ⚠️ |
| HST-132 | Past the last page | P2 | Boundary | PC-A | 1. Open `?page=5` | "No more hosts to display" (or it jumps back to the last valid page). | 🤖 |
| HST-133 | Non-numeric `page` | P2 | Negative | PC-B | 1. Open `?page=abc` | Expected: fall back to page 0. Risk: the UI forwards NaN and the API returns 400 "non-int page value", so DataError would show. | 🐞 ❓Q15 |
| HST-134 | Negative `page` | P2 | Negative | PC-B | 1. Open `?page=-1` | Expected: fall back to page 0 (the API returns 400 "negative page value"). | ❓Q15 |

### 2.9 Pagination

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-140 | 50 per page, Next/Previous | P2 | Boundary | ≥ 51 hosts | 1. Load the page<br>2. Click Next, then Previous | 50 rows on page 0, the rest on page 1. The URL `page` updates. Previous is disabled on the first page and Next on the last. | **N/A (data)**. Possible with osquery-perf hosts or a mock. |
| HST-141 | Exactly 50 hosts | P2 | Boundary | 50 hosts | 1. Load the page | A single page. Next is disabled, or shows "No more hosts to display". | N/A (data) |
| HST-142 | Selection across pages | P2 | Edge | ≥ 51 hosts | 1. Select rows<br>2. Go to the next page | Record whether the selection is cleared. | N/A (data) |

### 2.10 Selection and bulk delete

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-150 | Select one row | P1 | Happy | PC-C | 1. Click the row checkbox (`tr:has(a:text("<name>")) [role=checkbox]`) | `aria-checked=true`. The header becomes "1 selected", Clear selection, **Delete** and Run script. **No** Transfer. | 🤖 |
| HST-151 | Select several rows | P1 | Happy | PC-A | 1. Check 2 rows | "2 selected". The header checkbox is `aria-checked="mixed"`. | 🤖 |
| HST-152 | Select all on the page | P1 | Boundary | PC-A | 1. Click the header checkbox | All rows are checked. "N selected" / "All hosts on this page are selected". **No** "Select all matching hosts" (< 50). | 🤖 |
| HST-153 | Clear selection | P1 | Happy | after HST-151 | 1. Click "Clear selection" | Nothing is selected and the normal header comes back. | 🤖 |
| HST-154 | Uncheck the header | P2 | Happy | after HST-152 | 1. Click the header checkbox again | Nothing is selected. | |
| HST-155 | Modal copy: 1 host | P1 | Happy | PC-C selected | 1. Click Delete | "Delete" modal: "This will remove all host data such as unlock PINs and disk encryption keys." / "This host will re-enroll unless Fleet's agent is uninstalled. Learn more". Delete + Cancel. | 🤖 |
| HST-156 | Modal copy: N Linux hosts | P1 | Happy | 2 Linux hosts selected | 1. Click Delete | "This will remove **2 hosts** and associated data…" / "These hosts will re-enroll…". | 🤖 |
| HST-157 | Modal copy: mixed platforms | P2 | Edge | macOS + Linux selected | 1. Click Delete | The generic, bulleted mixed-platform copy. | |
| HST-158 | Cancel / X / Esc is non-destructive | P0 | Negative | 2 hosts selected | 1. Click Delete<br>2. Cancel (repeat with X and Esc) | The modal closes. **No** `POST /hosts/delete`. The hosts remain in the UI and the API. Record whether the selection is kept. | 🤖P0 🔌 |
| HST-159 | Confirm bulk delete | P1 | Happy | 2 simulated Linux hosts selected | 1. Click Delete<br>2. Confirm Delete | Loading state. `POST /hosts/delete {ids:[a,b]}`. Toast "Hosts successfully deleted." Selection reset. List and count refetched. `GET /hosts/a` and `/b` return **404** right afterwards. | 🤖 💥 🔌 |
| HST-160 | Re-enrollment after bulk delete | P2 | Edge | after HST-159 | 1. Wait 1–2 check-ins<br>2. Reload | The hosts come back (maybe with **new ids**), as the copy promises. Not a bug. | ⚠️ |
| HST-161 | Double-click confirm | P2 | Edge | 1 host selected | 1. Double-click Delete in the modal | A single request (the loading state disables the button). No error toast. | 💥 |
| HST-162 | Bulk delete fails | P2 | Error | Mock `POST /hosts/delete` with a 500 | 1. Confirm | Toast "Could not delete hosts. Please try again." The hosts remain. | 🤖 (route mock) |
| HST-163 | Delete every host on the page | P2 | Boundary | All selected | 1. Confirm | Empty state or last valid page, with no crash. Hosts re-enroll later. | 💥 ⚠️ run last |
| HST-164 | Selection vs a changed search | P2 | Edge | 1 selected | 1. Type a search that excludes the selected host | Record whether the selection is cleared or kept. A delete must never hit hidden hosts without a visible "N selected". | ❓Q16 |
| HST-165 | "Select all matching hosts" | P2 | Boundary | ≥ 50 selected | 1. Select all<br>2. Click "Select all matching hosts"<br>3. Delete | `POST /hosts/delete {filters:{…}}`. | **N/A (data)** |
| HST-166 | Transfer action | — | — | — | — | Must be absent on free (checked in HST-150). | **N/A (Premium)** |
| HST-167 | Run script bulk action | — | — | — | — | Present. **Don't run it.** | **Out of scope** |

### 2.11 Add hosts, enroll secrets and the gear menu

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-168 | Add hosts modal opens | P1 | Happy | PC-B | 1. Click "Add hosts" | "Add hosts" with tabs macOS, Windows, Linux, ChromeOS, iOS & iPadOS, Android, Advanced. `fleetctl package` instructions with copy buttons. | 🤖 |
| HST-169 | Switch Add hosts tabs | P2 | Happy | after HST-168 | 1. Click each tab | The content changes per platform with no errors. | |
| HST-170 | Copy a command | P2 | Happy | after HST-168 | 1. Click copy | "Copied" feedback, and the clipboard holds the command. | |
| HST-171 | Close Add hosts | P2 | Negative | after HST-168 | 1. Close with X / Esc / Done | The modal closes. The URL and list are unchanged. | |
| HST-172 | Deep link `?add_hosts=1` | P2 | Happy | PC-B | 1. Open `/hosts/manage?add_hosts=1` | The modal opens and the param is removed from the URL. | 🤖 |
| HST-173 | Gear menu (free) | P2 | Happy | PC-B | 1. Open "Hosts page settings" | Enroll secrets; Custom host vitals (out of scope target); "Activity automations" **disabled** with the tooltip "Activity automations are available in Fleet Premium." | 🤖 |
| HST-174 | Enroll secrets modal | P2 | Happy | PC-B | 1. Gear → Enroll secrets | Lists the global secret (masked or revealable). Closes cleanly. | |
| HST-175 | Deep link `?manage_enroll_secrets=1` | P2 | Happy | PC-B | 1. Open with the param | The secrets modal opens and the param is removed. | |
| HST-176 | No-enroll-secret banner | P2 | Edge | Remove all global secrets (restore them afterwards) | 1. Load Hosts<br>2. Open Add hosts | Yellow banner "You have no enroll secrets. New hosts will not enroll until an enroll secret is added to Fleet." with "Add enroll secret". The modal shows "You have no enroll secrets." | 💥 environment-altering; run last |

### 2.12 Roles and permissions

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-180 | Maintainer | P2 | Happy | PC-F | 1. Log in as Maintainer<br>2. Open Hosts | Checkboxes, bulk Delete and Add hosts are visible. | |
| HST-181 | Observer is read-only | P1 | Negative | PC-F | 1. Log in as Observer<br>2. Open Hosts | **No** row checkboxes, no bulk actions and no Add hosts. Search, filters, sort and export work. | 🤖 |
| HST-182 | Observer+ | P2 | Negative | PC-F | 1. Log in as Observer+ | Same host-management restrictions as Observer. | |
| HST-183 | Observer can't delete through the API | P2 | Negative | PC-F | 1. As Observer, `POST /hosts/delete` | 403. | 🔌 |

### 2.13 Accessibility smoke

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-190 | Keyboard operation | P2 | A11y | PC-A | 1. Tab through the search, selects, headers and host links<br>2. Press Enter on a link | Focus is visible. The selects work from the keyboard. Enter opens details. | |
| HST-191 | Modal focus and Esc | P2 | A11y | PC-A | 1. Open Edit columns / Delete with the keyboard<br>2. Press Esc | Focus moves into the modal and Esc closes it. Note the missing `role="dialog"`/`aria-modal` and the unnamed close X. | 🐞 ❓Q17 |
| HST-192 | Row checkbox name | P2 | A11y | PC-A | 1. Inspect a row checkbox | Currently it has no accessible name. Expected: "Select <host>". | 🐞 |
| HST-193 | Search input label | P2 | A11y | PC-A | 1. Inspect the input | Placeholder only, with no label or aria-label. | 🐞 |
| HST-194 | axe scan | P2 | A11y | PC-A | 1. Run `@axe-core/playwright` on `/hosts/manage` | No critical violations. Record the serious ones. | 🤖 |

### 2.14 Navigation to Host details

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-200 | Host name link opens details | P0 | Happy | PC-C | 1. Click the PC-C name link | `/hosts/<id>/details` (no `fleet_id`). H1 = display_name. | 🤖P0 |
| HST-201 | Clicking elsewhere in the row doesn't navigate | P1 | Negative | PC-C | 1. Click the OS cell and the Status cell | You stay on `/hosts/manage`. | 🤖 |
| HST-202 | Open in a new tab | P2 | Edge | PC-C | 1. Cmd/Ctrl-click the name | Details open in a new tab (a real `<a href>`). | |

---

## 3. Host details page: `/hosts/:id`

### 3.1 Routing and errors

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-001 | `/hosts/:id` redirects to `/details` | P1 | Happy | PC-C | 1. Open `/hosts/<id>` | The URL becomes `/hosts/<id>/details` and the Details tab is selected. | 🤖 |
| DET-002 | Deep link to each tab | P1 | Happy | PC-C | 1. Open `/details`, `/software`, `/reports` and `/policies` directly | The matching tab is selected. `/software` normalizes to `/software/inventory`. | 🤖 |
| DET-003 | Tab clicks update the URL | P1 | Happy | PC-C | 1. Click Software → Reports → Policies → Details | The path updates on each click (history push). The query string is dropped. | 🤖 |
| DET-004 | Back/Forward across tabs | P2 | Edge | after DET-003 | 1. Press browser Back ×3, then Forward | The tab and content follow the URL. | |
| DET-005 | Non-existent id shows a 404 | P0 | Negative | PC-B | 1. Open `/hosts/99999999/details` | The Fleet 404 page: H1 "404: We can't find that page!". No partial host UI. (The API returns 404.) | 🤖P0 🔌 |
| DET-006 | Non-numeric id | P1 | Negative | PC-B | 1. Open `/hosts/abc/details` | A 404 or 500 page, never blank or crashed. Record which. | 🤖 ❓Q18 |
| DET-007 | Id 0, negative, or overflow | P2 | Boundary | PC-B | 1. Open `/hosts/0`<br>2. Open `/hosts/-1`<br>3. Open `/hosts/99999999999999999999` | A graceful 404 or error page each time. | ❓Q18 |
| DET-008 | Deleted host's old URL | P1 | Negative | after DET-062 | 1. Open the old URL | 404, unless it re-enrolled under the same id (record which). | 🤖 ⚠️ |
| DET-009 | `/hosts/:id/scripts` | P2 | Edge | PC-C | 1. Open the path | The Details content renders and there's no Scripts tab. Nothing is run. | Route check only (scripts are out of scope) |
| DET-010 | `/hosts/:id/controls` on free | P2 | Negative | PC-C | 1. Open the path | No Controls tab. Record whether it redirects or renders empty. | N/A (MDM) ❓Q19 |
| DET-011 | Unknown sub-path | P2 | Negative | PC-C | 1. Open `/hosts/<id>/bogus` | 404 page. | |
| DET-012 | Unauthenticated deep link | P1 | Negative | Logged out | 1. Open `/hosts/<id>/details` | You're redirected to login. Record whether you return to the host after logging in. | ❓Q20 |
| DET-013 | Host API 500 | P2 | Error | Mock `GET /hosts/:id` with a 500 | 1. Load details | The Fleet500 error page. | 🤖 (route mock) |
| DET-014 | Loading spinner | P2 | Happy | Throttled network | 1. Load details | A spinner shows until the host and activities load. | |
| DET-015 | Document title | P2 | Happy | PC-C | 1. Read the title | `<display_name> \| Hosts \| Fleet`. | 🤖 |

### 3.2 Back to all hosts

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-020 | Back keeps search, status and sort | P1 | Happy | PC-A | 1. On Hosts, search + Online + sort OS desc<br>2. Open a host<br>3. Click "Back to all hosts" | The same URL params come back, the input is pre-filled and the list is filtered. | 🤖 |
| DET-021 | Back keeps the label path | P2 | Happy | PC-A | 1. Filter by a label<br>2. Open a host<br>3. Back | You return to `/hosts/manage/labels/<id>…`. | 🤖 |
| DET-022 | Back without history | P1 | Edge | PC-C | 1. Open the details URL in a fresh tab<br>2. Click Back to all hosts | You go to `/hosts/manage` (the fallback). | 🤖 |
| DET-023 | Back after switching tabs | P2 | Edge | after DET-020 | 1. Open a host → Software → Back to all hosts | The filters are still restored. | |
| DET-024 | Back is a button | P2 | A11y | PC-C | 1. Inspect it | A `<button>` that can be activated from the keyboard (not a link, so there's no open-in-new-tab). | |

### 3.3 Header and summary

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-030 | H1 = display_name | P0 | Happy | PC-C | 1. Open details | H1 `.display-name` = the API `display_name`. | 🤖P0 🔌 |
| DET-031 | Status matches the API | P0 | Happy | PC-C | 1. Read Status in the summary | "Online" (capitalized) = the API `status`. | 🤖P0 🔌 |
| DET-032 | Offline status | P1 | Happy | PC-E | 1. Open the offline host | Status shows "Offline". | 🤖 |
| DET-033 | Last fetched | P1 | Happy | PC-C | 1. Read the header | "Last fetched <time ago>", consistent with max(`detail_updated_at`, `policy_updated_at`). | |
| DET-034 | Issues only when > 0 | P2 | Boundary | A host with 0 issues vs a host with a failing policy (create the policy by API) | 1. Compare the two | Issues is hidden at 0 and shown with a count at > 0. | |
| DET-035 | Premium summary fields are absent | P2 | Negative | PC-C | 1. Inspect the summary | No Fleet, Patch deadline or Scheduled maintenance. | N/A (Premium) |
| DET-036 | Online history modal | P2 | Happy | PC-C | 1. Click the Status value | An "Online history" modal opens, showing history or "No online history yet." It closes with X/Esc. | |
| DET-037 | No device-status tag | P2 | Negative | PC-C | 1. Inspect the header | No lock or wipe tag. | N/A (MDM) |
| DET-038 | Empty display name | P2 | Edge | A host with an empty name | 1. View it | H1 "---". | N/A (data) |

### 3.4 Refetch

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-040 | Refetch an online host | P1 | Happy | PC-C | 1. Click "Refetch" | `POST /hosts/:id/refetch`. The button becomes "Fetching fresh vitals...this may take a moment" (disabled). `GET /hosts/:id` is polled every ~2 s. When `refetch_requested` clears, the button reads "Refetch" again and "Last fetched" updates. | 🤖 🔌 |
| DET-041 | Disabled when offline | P1 | Negative | PC-E | 1. Open the offline host<br>2. Hover Refetch | Disabled, with the tooltip "You can't fetch data from an offline host." | 🤖 |
| DET-042 | Host goes offline mid-refetch | P2 | Edge | PC-C | 1. Click Refetch<br>2. Immediately `docker stop` the host | Toast "This host is offline. Please try refetching host vitals later." The button resets. | ⚠️ timing |
| DET-043 | 60 s timeout | P2 | Boundary | Mock `GET /hosts/:id` to keep `refetch_requested=true` | 1. Refetch<br>2. Wait 60 s (or fast-forward the clock) | Toast "Refetch sent but vitals are taking longer than expected to load. You'll see an update when the host responds." | 🤖 (route mock + clock) |
| DET-044 | Refetch POST fails | P2 | Error | Mock POST refetch with a 500 | 1. Click Refetch | Toast `Host "<name>" <reason>`. The button resets. | 🤖 (route mock) |
| DET-045 | Double-click | P2 | Edge | PC-C | 1. Double-click Refetch | Only one POST. | |
| DET-046 | Leave the page mid-refetch | P2 | Edge | PC-C | 1. Refetch<br>2. Click Back to all hosts | Polling stops, with no console errors and no stray toasts. | |

### 3.5 Actions menu

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-050 | Free admin, Linux host | P1 | Happy | PC-C | 1. Open "Actions" | The `data-testid=dropdown-option` items are Live report, Run script and Delete. There's **no** Transfer, Lock, Wipe, Unlock, Clear passcode, disk key or Turn off MDM. | 🤖 |
| DET-051 | Free admin, macOS host | P2 | Happy | macOS host | 1. Open Actions | The free set. MDM items only if MDM-enrolled. Record the options. | |
| DET-052 | Live report disabled offline | P2 | Negative | PC-E | 1. Open Actions on the offline host | Live report is disabled: "You can't run a live report on an offline host." Don't click it. | Visibility only |
| DET-053 | Run script present | — | — | PC-C | 1. Check that it's present | Present, or disabled if scripts are disabled. **Don't run it.** | **Out of scope** |
| DET-054 | Close without choosing | P2 | Negative | PC-C | 1. Open Actions<br>2. Press Esc or click outside | The menu closes and nothing is triggered. | |
| DET-055 | Observer Actions | P2 | Negative | PC-F | 1. Open a host as Observer / Observer+ | No Delete. The menu is hidden when no options are available. | |
| DET-056 | Premium/MDM actions | — | — | — | — | Transfer, Lock, Wipe, Unlock, Clear passcode, Show disk encryption key, Recovery Lock, Release from ABM, Turn off MDM | **N/A (Premium/MDM)** |

### 3.6 Delete host (single)

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-060 | Delete modal copy | P1 | Happy | PC-C | 1. Actions → Delete | "Delete" modal: "This will remove all host data such as unlock PINs and disk encryption keys." / "This host will re-enroll unless Fleet's agent is uninstalled. Learn more". Delete + Cancel. | 🤖 |
| DET-061 | Cancel / X / Esc is non-destructive | P0 | Negative | PC-C | 1. Open the modal<br>2. Cancel (repeat with X and Esc) | The modal closes, there's **no** `DELETE` request, you stay on details and `GET /hosts/:id` returns 200. | 🤖P0 🔌 |
| DET-062 | Confirm delete | P0 | Happy | PC-C (a simulated Linux host, **not** the Mac) | 1. Actions → Delete → Delete | `DELETE /hosts/:id` returns 200. Toast **`Host "<display_name>" was successfully deleted.`** Redirect to `/hosts/manage`. The host is absent from the list. `GET /hosts/:id` returns **404** right afterwards. | 🤖P0 💥 🔌 |
| DET-063 | Redirect drops the previous filters | P2 | Edge | Opened from `?status=online&query=x` | 1. Delete the host | You land on plain `/hosts/manage` with the defaults, not the filtered URL. | 💥 ❓Q21 |
| DET-064 | Re-enrollment | P2 | Edge | after DET-062 | 1. Wait 1–2 intervals<br>2. Search for the hostname | It re-appears, possibly with a **new id**. The old id stays 404 unless it was reused. | ⚠️ |
| DET-065 | Delete fails | P2 | Error | Mock DELETE with a 500 | 1. Confirm delete | Toast `Host "<name>" could not be deleted.` You stay on the page and the host exists. | 🤖 (route mock) |
| DET-066 | Double-click confirm | P2 | Edge | PC-C | 1. Double-click Delete in the modal | A single DELETE request and no second error toast. | 💥 |
| DET-067 | Concurrent delete (two tabs) | P2 | Edge | The same host open in tabs A and B | 1. Delete in tab A<br>2. In tab B, Actions → Delete → confirm | Tab B shows the "could not be deleted" toast (404), and no crash. Reloading B gives the 404 page. | 💥 |
| DET-068 | Stale tab interactions | P2 | Edge | after DET-067 (tab B) | 1. Click Refetch / switch tabs in B | Graceful error or 404 handling. | |

### 3.7 Tabs

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-070 | Tabs for a Linux host | P0 | Happy | PC-C | 1. Read the `role=tab` items | Details, Software, Reports, Policies. **No** Controls. | 🤖P0 |
| DET-071 | Tabs for the macOS host | P2 | Happy | macOS host | 1. Read the tabs | Details, Software, Reports, Policies (Controls only with MDM). | |
| DET-072 | Policies failing badge | P2 | Boundary | A host with failing policies vs a host with 0 | 1. Compare | Red count = `failing_policies_count`. No badge at 0. | |
| DET-073 | Every tab renders cleanly | P0 | Happy | PC-C | 1. Click each tab | Content or an empty state renders, with no error toast and no DataError. | 🤖P0 |
| DET-074 | Platform-specific hiding | P2 | Edge | An iOS/Android/ChromeOS host | — | Reports is hidden for iOS/iPadOS/Android/ChromeOS. Policies is hidden for iOS/iPadOS/Android. | **N/A (data)** |

### 3.8 Details tab cards

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-080 | Vitals card, alphabetical | P1 | Happy | PC-C | 1. Find the "Vitals" card | The fields are sorted alphabetically by title. | 🤖 |
| DET-081 | Vitals match the API (Linux) | P0 | Happy | PC-C | 1. Compare each field with `GET /hosts/:id` | OS = `os_version`. Private IP = `primary_ip`. Public IP = `public_ip`. MAC = `primary_mac`. Processor = `cpu_type`. Memory = formatted `memory`. Hardware model = `hardware_model`. Disk space = `gigs_disk_space_available` (and %). Agent = `orbit_version`/`osquery_version`. Added to Fleet and Last restarted are consistent with the timestamps. | 🤖P0 🔌 |
| DET-082 | Agent tooltip | P2 | Happy | PC-C | 1. Hover Agent | Shows the osquery, Orbit and Fleet Desktop versions, as reported. | |
| DET-083 | Optional vitals hidden when not reported | P2 | Boundary | A Linux sim host | 1. Look for Serial number, Battery condition, Location, Timezone, Disk encryption | Absent when the API value is empty. Never an "undefined" or empty label. | 🤖 |
| DET-084 | macOS vitals | P2 | Happy | macOS host | 1. Read the vitals | Serial number, Hardware model, Disk encryption and Battery are present (when reported) and match the API. | 🔌 |
| DET-085 | Units and formatting | P2 | Boundary | Any host | 1. Check memory and disk | Correct units (GB) and rounding. Low-disk display is sensible. | ❓Q22 |
| DET-086 | Labels card | P1 | Happy | PC-C | 1. Read "Labels" | Equals the API `labels` (e.g. All Linux, Ubuntu Linux). | 🤖 🔌 |
| DET-087 | Click a label goes to the filtered Hosts page | P1 | Happy | PC-C | 1. Click "All Linux" | `/hosts/manage/labels/<id>`, filtered (lands back on the in-scope Hosts page). "All Hosts" goes to `/hosts/manage`. | 🤖 |
| DET-088 | No labels | P2 | Boundary | A host with no labels | — | "No labels are associated with this host." | N/A (data) |
| DET-089 | Activity card | P2 | Happy | PC-C | 1. Switch Past / Upcoming | Both render. Empty: "No activity" / "Completed commands will appear here." Upcoming shows a count. | |
| DET-090 | Activity paging (8 per page) | P2 | Boundary | A host with > 8 activities | 1. Page through | Next and Previous work. | N/A (data) |
| DET-091 | User card | P2 | Happy | PC-C | 1. View it | IdP fields or empty values. The edit control is visible for an admin. | |
| DET-092 | Agent options card | P2 | Happy | PC-C | 1. Read the card | Config TLS refresh, Logger TLS period and Distributed interval equal the API fields. | 🔌 |
| DET-093 | Local user accounts search | P2 | Happy/Negative | PC-C | 1. Search `root`<br>2. Search `zzz` | Step 1 filters the list. Step 2 shows "No users match your search criteria". | |
| DET-094 | No local users | P2 | Boundary | A host with no users | — | "No users detected on this host". | N/A (data) |
| DET-095 | Certificates card | — | — | Apple/Windows with certificates | — | Shown only when present. | N/A (MDM/data) |

### 3.9 Software tab (Inventory)

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-100 | Inventory list and count | P0 | Happy | PC-C (Linux with software) | 1. Open Software | Count "N items" = the API `count` from `/hosts/:id/software`. Columns: Name, Installed version, Type, Last opened, Vulnerabilities, File path/Hash. **No** Library sub-tab. | 🤖P0 🔌 |
| DET-101 | First page = API (20 per page, name ascending) | P1 | Happy | PC-C | 1. Compare the first 20 names | Same names and order as `?per_page=20&order_key=name&order_direction=asc`. | 🤖 🔌 |
| DET-102 | Search by name | P0 | Happy | PC-C | 1. Type a known package (e.g. `bash`) in "Search by name or vulnerability (CVE)" | After about 500 ms the results match the API with `query`. URL `?query=bash`. | 🤖P0 🔌 |
| DET-103 | Search with no match | P0 | Negative | PC-C | 1. Search for `zzz-no-such-pkg` | "No items match the current search criteria". | 🤖P0 |
| DET-104 | Search by CVE | P2 | Happy | A host with vulnerabilities | 1. Search a CVE id | The matching software is listed. Mark **N/A (data)** if vulnerability processing hasn't run. | ⚠️ |
| DET-105 | Trim, case and special characters | P2 | Edge | PC-C | 1. Search `  BASH  `<br>2. Search `%`<br>3. Search `<script>` | Case-insensitive trimmed match. Literal special characters, no errors. | |
| DET-106 | Sort by Name | P1 | Happy | PC-C | 1. Click the Name header | URL `order_key=name&order_direction=desc`. Reversed, and matches the API. | 🤖 🔌 |
| DET-107 | Pagination | P1 | Boundary | PC-C with > 20 items | 1. Next<br>2. Previous | URL `page=1` with 20 different items. Previous is disabled on page 0 and Next on the last page (`meta.has_next_results`). | 🤖 🔌 |
| DET-108 | Deep link search + page | P2 | Happy | PC-C | 1. Open `/hosts/<id>/software/inventory?query=lib&page=1` | Pre-filled, and the page is respected. | |
| DET-109 | Filter: vulnerable only | P2 | Happy | PC-C | 1. Add filters → vulnerable → Apply | The button reads "Filtered". The list shows vulnerable software only (or the empty state). | |
| DET-110 | Filter by type | P2 | Happy | PC-C | 1. Filter by a type (e.g. deb packages) | Only that type is listed. | |
| DET-111 | Reset filters | P2 | Happy | after DET-109 | 1. Clear the filters | The full list comes back and the button reads "Add filters". | |
| DET-112 | Host with no software | P2 | Boundary | Mock an empty response, or a freshly enrolled host | 1. Open Software | "No software found" / "Expecting to see software? Check back later." | 🤖 (route mock) ⚠️ |
| DET-113 | Inventory disabled | P2 | Negative | Set `features.enable_software_inventory=false` by API (restore it after) | 1. Open Software | "Software inventory disabled". | Environment-altering |
| DET-114 | Software name link | — | — | PC-C | 1. Check that it's present | A link to the software title page. **Don't follow it.** | Out of scope target |
| DET-115 | macOS types + "Show helpers" | P2 | Edge | macOS host | 1. Open Software | The URL is normalized to App (macOS). The "Show helpers" toggle changes the list. | |
| DET-116 | Software Library | — | — | — | — | — | **N/A (Premium)** |
| DET-117 | Invalid software URL params | P2 | Negative | PC-C | 1. Open `?page=-1`<br>2. Open `?order_key=bogus` | Graceful fallback or error state, never a blank page. | ❓Q12 |

### 3.10 Reports tab

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-120 | Reports tab renders | P1 | Happy | PC-C | 1. Open Reports | Either a list with "Search by name", or "No reports scheduled" / "Select Refetch to load the latest data from this host, or schedule a report." plus "Schedule a report". | 🤖 |
| DET-121 | Reports search | P2 | Happy/Negative | A host with reports | 1. Search an existing name<br>2. Search a missing name | Step 1 filters the list. Step 2 shows a no-match state. | N/A (data) if empty |
| DET-122 | "Schedule a report" button | — | — | PC-C | 1. Check that it's present | Present. **Don't follow it.** | Out of scope target |
| DET-123 | Report row click | — | — | A host with reports | — | Goes to `/hosts/:id/reports/:qid`. | Out of scope target |

### 3.11 Policies tab

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-130 | Empty policies | P1 | Happy | PC-C, fresh preview | 1. Open Policies | "No policies checked" / "Select Refetch to load the latest data from this host, or manage its policies." plus "Manage policies" (not followed). | 🤖 |
| DET-131 | Policies with results | P1 | Happy | Create one passing and one failing global policy by API, then Refetch | 1. Open Policies | "N policies". Each row's pass/fail equals the API `policies[].response`. | 🤖 🔌 |
| DET-132 | Policy details modal | P2 | Happy | after DET-131 | 1. Click a row | A modal opens on the same page with the name, description and resolution. It closes cleanly. | |
| DET-133 | Pending response | P2 | Edge | A new policy, before refetch | 1. View it | The status shows pending/"---" until the host reports. | |

### 3.12 Roles and accessibility

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-140 | Observer is read-only | P1 | Negative | PC-F | 1. Open details as Observer | All tabs can be viewed. No Delete. Record Refetch availability. | 🤖 ❓Q23 |
| DET-141 | Maintainer can delete | P2 | Happy | PC-F | 1. Open Actions | Delete is present. | |
| DET-142 | axe scan of each tab | P2 | A11y | PC-C | 1. Run axe on each tab | No critical violations. | 🤖 |
| DET-143 | Keyboard: tabs and Actions | P2 | A11y | PC-C | 1. Use the arrow keys/Enter on the tabs<br>2. Open Actions with the keyboard | Can be operated, with visible focus. | |
| DET-144 | Delete modal semantics | P2 | A11y | PC-C | 1. Open the Delete modal | Focus moves into it. Note: no `role=dialog`, and the X has no accessible name. | 🐞 ❓Q17 |

---

## 4. Cross-page and environment

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| XPG-001 | Fresh-preview readiness | P0 | Happy | `fleetctl preview` just started | 1. Poll `GET /hosts/count` until stable<br>2. Poll Linux host software until > 0 | ≥ 2 hosts, all online. Software is populated within minutes. | 🤖P0 (global setup) |
| XPG-002 | UI and API agree after a delete | P1 | Edge | after DET-062 / HST-159 | 1. Compare the list and count with the API | They're equal, and the deleted ids are absent (no stale cache). | 🤖 🔌 |
| XPG-003 | Label count vs rows | P2 | Happy | PC-A | 1. Compare the All Linux filter count with the Linux rows in the unfiltered list | Equal. | 🔌 |
| XPG-004 | Session across both pages | P1 | Happy | PC-B | 1. Go Hosts → details → Back → reload | You stay logged in throughout. | 🤖 |
| XPG-005 | Cross-browser sanity | P2 | Happy | PC-A | 1. Run HST-001, 020, 200 and DET-030, 100 in Firefox and WebKit | Same results. | 🤖 (projects) |
| XPG-006 | Narrow viewport | P2 | Edge | PC-A | 1. Test at 1024 px and 768 px | The tables scroll. Controls and modals stay reachable. | |
| XPG-007 | Data changes while the page is open | P2 | Edge | PC-E | 1. Keep Hosts open<br>2. Stop a container<br>3. Wait<br>4. Check without reloading, then reload | Record whether the status updates without a reload (no live push expected). | ❓Q24 |
| XPG-008 | Time zone | P2 | Edge | PC-C | 1. Change the OS time zone<br>2. Reload | Relative times are unchanged. Absolute tooltips are in local time. | |

---

## 5. Coverage matrix and traceability

Requirement areas are taken from the source-backed requirements brief (`fleet-hosts-requirements.md`).

**Legend:**
- ✅ = manual cases exist and can run on free preview
- 🤖P0 = in the first automation subset
- N/A = listed but can't be run on free preview

### 5.1 Hosts page

| Requirement area | Cases | Free preview |
|---|---|---|
| Header, list, count, default sort, URL normalization, title | HST-001–007, 009, 010, 015–018, 090 | ✅ (🤖P0: 001, 002, 003) |
| Loading / DataError | HST-008, 011, 012 | ✅ (mock) |
| Auth guard | HST-013, 014 | ✅ |
| Search: fields, debounce, trim, escaping, deep link, combos | HST-020–043 | ✅ (🤖P0: 020, 031, 032, 040). 026 is data-dependent. |
| Status filter: free options, server rules, bad params | HST-050–063 | ✅ (🤖P0: 051, 052 with PC-E). Pending is **N/A (Premium)**. |
| Label / platform filter, pill, label delete | HST-070–085 | ✅ |
| Sorting, inverted time columns, invalid params, a11y name | HST-090–101 | ✅ |
| Edit columns: persist, cancel, fail, per-user | HST-102–111 | ✅ |
| Export CSV | HST-120–127 | ✅ |
| Empty states and bad page params | HST-128, 130–134 | ✅ (🤖P0: 128; 131 via mock) |
| Pagination | HST-140–142 | **N/A (data)**: < 50 hosts |
| Selection + bulk delete | HST-150–165 | ✅ (🤖P0: 158). 165 is **N/A (data)**. |
| Transfer / bulk Run script | HST-166, 167 | **N/A (Premium)** / **Out of scope** |
| Add hosts, enroll secrets, gear menu, deep-link modals | HST-168–176 | ✅ (Activity automations is Premium; checked disabled) |
| Roles | HST-180–183 | ✅ (PC-F) |
| Accessibility | HST-190–194 | ✅ |
| Navigation to details | HST-200–202 | ✅ (🤖P0: 200) |
| Fleets dropdown, Fleet/MDM columns, MDM/low-disk/bootstrap filters | Absence checked in HST-001, 004 | **N/A (Premium/MDM)** |

### 5.2 Host details page

| Requirement area | Cases | Free preview |
|---|---|---|
| Routes, redirects, tab URLs, 404/500 | DET-001–015 | ✅ (🤖P0: 005). Controls is **N/A (MDM)**. |
| Back to all hosts (filteredHostsPath) | DET-020–024 | ✅ |
| Header + summary, Online history | DET-030–038 | ✅ (🤖P0: 030, 031) |
| Refetch: online, offline, timeout, error | DET-040–046 | ✅ (043/044 via mock) |
| Actions menu | DET-050–056 | ✅. Live report and Run script are **out of scope**. Lock/Wipe etc. are **N/A**. |
| Delete: cancel, confirm, toast, redirect, re-enroll, concurrency | DET-060–068 | ✅ (🤖P0: 061, 062) |
| Tabs (free), badge, platform hiding | DET-070–074 | ✅ (🤖P0: 070, 073). 074 is **N/A (data)**. |
| Vitals | DET-080–085 | ✅ (🤖P0: 081) |
| Labels / Activity / User / Agent options / Local users / Certs | DET-086–095 | ✅. Certs are **N/A**. |
| Software inventory | DET-100–117 | ✅ (🤖P0: 100, 102, 103). Library is **N/A (Premium)**. |
| Reports tab | DET-120–123 | ✅ (render/empty). Destinations are **out of scope**. |
| Policies tab + modal | DET-130–133 | ✅ |
| Roles / a11y | DET-140–144 | ✅ |
| Cross-page / environment | XPG-001–008 | ✅ (🤖P0: XPG-001) |

### 5.3 Explicitly not covered

| Item | Reason |
|---|---|
| Running scripts (bulk/host), executing Live report | Out of scope (assessment) |
| Label new/edit, Custom host vitals, software title, schedule report, manage policies, host report pages | Out of scope (navigates away). Only the presence of the entry point is checked. |
| Fleets/teams, Transfer, Pending, Software Library, lock/wipe/unlock, patch deadline, maintenance, activity automations | N/A: Premium |
| Controls tab, MDM columns/filters/modals, Turn off MDM, device-status tags | N/A: needs MDM |
| More than 50 hosts (pagination, "Select all matching") | N/A on stock preview. Could be done with osquery-perf hosts or mocks. |
| Performance/load, security testing | Beyond take-home scope |

---

## 6. Recommended automation subset

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
11. **DET-061**, then **DET-062** 💥: delete cancel, then confirm (toast, redirect, API 404 right afterwards)

**Next (P1) wave:**
- HST-059 (unknown status)
- HST-091/093 (sort)
- HST-103/104/106 (edit columns)
- HST-120–122 (export)
- HST-159 💥 (bulk delete confirm)
- HST-071/073 (labels)
- HST-181/DET-140 (observer)
- DET-020/022 (back keeps filters)
- DET-040/041 (refetch)
- DET-050 (actions)
- DET-130/131 (policies)

**Mock-only (`page.route`):** HST-011, 107, 126, 131, 162; DET-013, 043, 044, 065, 112.

---

## 7. Open product questions
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
