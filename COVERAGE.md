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
