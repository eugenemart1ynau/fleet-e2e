# Host details page: Details tab cards

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 16 (DET-080 – DET-095)  
**Source section:** §3.8 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.8 Details tab cards

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-080 | Vitals card, alphabetical | P1 | Happy | PC-C | 1. Find the "Vitals" card | The fields are sorted alphabetically by title. | [AUTO] |
| DET-081 | Vitals match the API (Linux) | P0 | Happy | PC-C | 1. Compare each field with `GET /hosts/:id` | OS = `os_version`. Private IP = `primary_ip`. Public IP = `public_ip`. MAC = `primary_mac`. Processor = `cpu_type`. Memory = formatted `memory`. Hardware model = `hardware_model`. Disk space = `gigs_disk_space_available` (and %). Agent = `orbit_version`/`osquery_version`. Added to Fleet and Last restarted are consistent with the timestamps. | [AUTO-P0] [API] |
| DET-082 | Agent tooltip | P2 | Happy | PC-C | 1. Hover Agent | Shows the osquery, Orbit and Fleet Desktop versions, as reported. | |
| DET-083 | Optional vitals hidden when not reported | P2 | Boundary | A Linux sim host | 1. Look for Serial number, Battery condition, Location, Timezone, Disk encryption | Absent when the API value is empty. Never an "undefined" or empty label. | [AUTO] |
| DET-084 | macOS vitals | P2 | Happy | macOS host | 1. Read the vitals | Serial number, Hardware model, Disk encryption and Battery are present (when reported) and match the API. | [API] |
| DET-085 | Units and formatting | P2 | Boundary | Any host | 1. Check memory and disk | Correct units (GB) and rounding. Low-disk display is sensible. | QQ22 |
| DET-086 | Labels card | P1 | Happy | PC-C | 1. Read "Labels" | Equals the API `labels` (e.g. All Linux, Ubuntu Linux). | [AUTO] [API] |
| DET-087 | Click a label goes to the filtered Hosts page | P1 | Happy | PC-C | 1. Click "All Linux" | `/hosts/manage/labels/<id>`, filtered (lands back on the in-scope Hosts page). "All Hosts" goes to `/hosts/manage`. | [AUTO] |
| DET-088 | No labels | P2 | Boundary | A host with no labels | — | "No labels are associated with this host." | N/A (data) |
| DET-089 | Activity card | P2 | Happy | PC-C | 1. Switch Past / Upcoming | Both render. Empty: "No activity" / "Completed commands will appear here." Upcoming shows a count. | |
| DET-090 | Activity paging (8 per page) | P2 | Boundary | A host with > 8 activities | 1. Page through | Next and Previous work. | N/A (data) |
| DET-091 | User card | P2 | Happy | PC-C | 1. View it | IdP fields or empty values. The edit control is visible for an admin. | |
| DET-092 | Agent options card | P2 | Happy | PC-C | 1. Read the card | Config TLS refresh, Logger TLS period and Distributed interval equal the API fields. | [API] |
| DET-093 | Local user accounts search | P2 | Happy/Negative | PC-C | 1. Search `root`<br>2. Search `zzz` | Step 1 filters the list. Step 2 shows "No users match your search criteria". | |
| DET-094 | No local users | P2 | Boundary | A host with no users | — | "No users detected on this host". | N/A (data) |
| DET-095 | Certificates card | — | — | Apple/Windows with certificates | — | Shown only when present. | N/A (MDM/data) |
