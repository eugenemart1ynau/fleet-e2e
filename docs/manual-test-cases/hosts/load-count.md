# Hosts page: Load, routing and count

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 18 (HST-001 – HST-018)  
**Source section:** §2.1 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.1 Load, routing and count

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
