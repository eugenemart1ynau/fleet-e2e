# Coverage matrix

Legend: ✅ automated · 🟡 planned (SHOULD) · ⚪ nice-to-have · ❌ out of scope / not testable on free preview

| Area | Feature | Status | Spec | Why |
|---|---|---|---|---|
| Hosts | List renders, count + names match `GET /hosts` | ✅ | hosts/hosts-list | Core: if this breaks nobody sees their fleet |
| Hosts | Host name link opens details | ✅ | hosts/hosts-list | Only entry point to details |
| Hosts | Search + `?query=` sync + deep link | ✅ | hosts/search | Primary lookup path |
| Hosts | No-match empty state | ✅ | hosts/search | Recovery path |
| Hosts | Status filter (Online) vs API | ✅ | hosts/status-filter | Triage |
| Hosts | Offline / Missing / New filters | 🟡 | hosts/status-filter (fixme) | Data-dependent on preview |
| Hosts | Sort by column | 🟡 | — | Triage; aria-label suspected broken |
| Hosts | Edit columns persists (server-side) | 🟡 | — | Per-user setting |
| Hosts | Export CSV matches API report | 🟡 | — | Reporting |
| Hosts | Bulk select → Delete modal | 🟡 | — | Destructive |
| Hosts | Label filter | ⚪ | — | Lower risk; needs seeded labels |
| Hosts | Pagination / select all matching | ❌ | — | Needs ≥50 hosts |
| Hosts | Transfer / Pending / Fleets column | ❌ | — | Premium |
| Hosts | Run script (batch) | ❌ | — | Out of scope |
| Hosts | Add hosts / enroll secrets | ⚪ | — | Setup flow |
| Details | Header name/status/title match API | ✅ | host-details/header | Data trust |
| Details | Tabs render | ✅ | host-details/header | Crash surface |
| Details | Vitals (OS, IP) match API | ✅ | host-details/vitals | Data trust |
| Details | Software inventory count + search | ✅ | host-details/software | Headline feature |
| Details | Software no-match empty state | ✅ | host-details/software | Recovery |
| Details | Delete: cancel safe, confirm deletes (API 404) | ✅ | host-details/delete-host | Destructive |
| Details | Refetch | 🟡 | header (fixme) | Freshness |
| Details | Back to all hosts keeps filters | 🟡 | header (fixme) | UX |
| Details | Policies / Reports tabs content | 🟡 | — | Crash surface |
| Details | Activity / Labels / Users cards | ⚪ | — | Lower risk |
| Details | Bad host id → 404 page | ⚪ | — | Error handling |
| Details | Run script, Live report | ❌ | — | Out of scope |
| Details | Lock / Wipe / MDM / Controls | ❌ | — | MDM / Premium |
| Details | Software Library / install | ❌ | — | Premium |

## API (`tests/api`, `npm run test:api`)

| Area | Check | Status | Spec |
|---|---|---|---|
| Auth | Login success, token works on `/me` | ✅ | api/auth |
| Auth | Wrong password / unknown user / empty creds → 401 same message | ✅ | api/auth |
| Auth | No token → 401 on `/hosts`, `/hosts/count`, `/hosts/:id`, `/hosts/:id/software`, `/me`; garbage token 401; unauth DELETE 401 and host survives; token dead after logout | ✅ | api/auth |
| Hosts | List shape, unique ids, count == list length | ✅ | api/hosts |
| Hosts | Sort asc/desc reverse, per_page/page, page past end empty | ✅ | api/hosts |
| Hosts | Invalid `status` 400, invalid `order_key` 422 | ✅ | api/hosts |
| Hosts | Each status (online/offline/new/missing/mia): subset of all, count == list; online/offline partition | ✅ | api/hosts |
| Hosts | Search: hostname, prefix, uuid, IP, serial, case-insensitive, no-match 0, whitespace = all, `%` literal, query+status | ✅ | api/hosts |
| Details | `GET /hosts/:id` fields match list, vitals typed, "All Hosts" label; `exclude_software` | ✅ | api/host-details |
| Details | Unknown id / `abc` / `0` → 404 | ✅ | api/host-details |
| Details | Software: count/items/meta, sorted, query narrows, no-match, unknown host 404 | ✅ | api/host-details |
| Details | DELETE / refetch unknown id → 404 | ✅ | api/host-details |
| Details | DELETE host 200 → GET 404 → second DELETE 404 | ✅ (not run yet, `test:api:destructive`) | api/hosts-delete |
| Hosts | Bulk `POST /hosts/delete`, `/hosts/report` CSV, refetch happy path | 🟡 | — |
