# Hosts page: Search

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 24 (HST-020 – HST-043)  
**Source section:** §2.2 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.2 Search

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-020 | Search by exact hostname | P0 | Happy | PC-C | 1. Type the PC-C `hostname` in "Search name, user email, hostname, UUID, serial number, or IP address" | After about 500 ms only that host is listed. Count = 1. The URL has `query=<hostname>&page=0`. | [AUTO-P0] [API] |
| HST-021 | Partial (substring) match | P0 | Happy | PC-A | 1. Type the first 3 characters of a hostname | Every host containing the substring in any searchable field is listed. The result equals `GET /hosts?query=`. | [AUTO] [API] |
| HST-022 | Search by UUID | P1 | Happy | PC-C | 1. Search for the full `uuid` | The PC-C host is listed. | [AUTO] |
| HST-023 | Search by IP (full and partial) | P1 | Happy | PC-C | 1. Search for the full `primary_ip`<br>2. Search for its first octets (e.g. `172.`) | Step 1 gives exactly one host. Step 2 gives all hosts with that prefix, matching the API. | [AUTO] [API] |
| HST-024 | Search by serial number | P1 | Happy | macOS host (has a serial) | 1. Search for the serial | The macOS host is listed. | |
| HST-025 | Query with inner spaces | P1 | Edge | macOS host | 1. Search for `MacBook Pro` | The macOS host is listed (the inner space is kept). | |
| HST-026 | Search by user email | P2 | Happy | A host with `host_emails`/device mapping | 1. Search for the email | The host is listed. Mark **N/A (data)** if no host has an email. | [CAUTION] |
| HST-027 | Case-insensitive | P1 | Edge | PC-C | 1. Search for the hostname in UPPERCASE | Same result as lowercase. | [AUTO] |
| HST-028 | Leading and trailing whitespace is trimmed | P1 | Edge | PC-C | 1. Search for `"  <hostname>  "` | Same result as the trimmed value. The URL `query` is trimmed. | [AUTO] |
| HST-029 | Whitespace-only query | P1 | Boundary | PC-A | 1. Type only spaces | It's treated as an empty query, so all hosts are shown. There's no `query` param (or it's empty). No empty state. | [AUTO] |
| HST-030 | Debounce | P2 | Edge | PC-A | 1. Watch the network<br>2. Type 8 characters quickly | About one `/hosts` request fires, roughly 500 ms after the last keystroke (not one per keystroke). | [AUTO] |
| HST-031 | No match shows the empty state | P0 | Negative | PC-A | 1. Search for `zzz-no-match-zzz` | "No hosts match your filters" / "Recently enrolled hosts will appear here after their first check-in." plus Add hosts. The search and filter controls stay **enabled**. | [AUTO-P0] |
| HST-032 | Clear search restores the list | P0 | Happy | after HST-031 | 1. Clear the input | The full list and count come back. `query` is removed from the URL. | [AUTO-P0] |
| HST-033 | `%` is literal, not a wildcard | P1 | Edge | PC-A | 1. Search for `%` | **0 results** (matches the API: `query=%25` returns `[]`). | [AUTO] [API] |
| HST-034 | `_` is literal, not a wildcard | P1 | Edge | PC-A | 1. Search for `_` | 0 results unless a field contains a literal `_`. Matches the API. | [AUTO] [API] |
| HST-035 | Injection-like and markup input | P1 | Negative | PC-A | 1. Search for `' OR 1=1 --`<br>2. Then `<script>alert(1)</script>`<br>3. Then `"` and `\` | No server error and no script execution. The no-match empty state is shown. The input shows the literal text. | [AUTO] |
| HST-036 | Unicode and curly-quote input | P2 | Edge | macOS host `Eugene’s …` | 1. Search for `Eugene’s` (curly)<br>2. Search for `Eugene's` (straight) | The curly version matches. The straight version gives 0 results (literal LIKE). Record this as a UX question. | QQ4 |
| HST-037 | Very long query | P2 | Boundary | PC-A | 1. Paste 1,000+ characters | No crash and no 414 error page. The empty state is shown, or a graceful error. | QQ5 |
| HST-038 | Single-character query | P2 | Boundary | PC-A | 1. Search for `a` | The search runs (no minimum length) and matches the API. | [API] |
| HST-039 | Search resets the page to 0 | P2 | Boundary | PC-A | 1. Open `?page=1`<br>2. Type a search | The URL has `page=0`. | |
| HST-040 | Deep link `?query=` | P0 | Happy | PC-C | 1. Open `/hosts/manage?query=<hostname>` | The input is pre-filled, the list is filtered and the count is correct. | [AUTO-P0] |
| HST-041 | Search + status | P1 | Happy | PC-A | 1. Search a substring<br>2. Choose Online hosts | Results are the intersection. The URL has `query` and `status`. Matches the API with both params. | [AUTO] [API] |
| HST-042 | Search + label | P1 | Happy | PC-A | 1. Choose the label "Debian-based Linux hosts"<br>2. Search a substring | Results are the intersection (`/labels/:id/hosts?query=`). | [AUTO] [API] |
| HST-043 | Browser Back after a search | P2 | Edge | PC-A | 1. Search for X<br>2. Press browser Back | Record the behavior. The page uses `router.replace`, so Back may leave the page instead of undoing the search. | QQ6 |
