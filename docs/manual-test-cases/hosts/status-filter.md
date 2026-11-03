# Hosts page: Status filter

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 14 (HST-050 – HST-063)  
**Source section:** §2.3 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.3 Status filter

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
