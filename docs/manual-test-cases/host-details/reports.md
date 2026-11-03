# Host details page: Reports tab

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 4 (DET-120 – DET-123)  
**Source section:** §3.10 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.10 Reports tab

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-120 | Reports tab renders | P1 | Happy | PC-C | 1. Open Reports | Either a list with "Search by name", or "No reports scheduled" / "Select Refetch to load the latest data from this host, or schedule a report." plus "Schedule a report". | [AUTO] |
| DET-121 | Reports search | P2 | Happy/Negative | A host with reports | 1. Search an existing name<br>2. Search a missing name | Step 1 filters the list. Step 2 shows a no-match state. | N/A (data) if empty |
| DET-122 | "Schedule a report" button | — | — | PC-C | 1. Check that it's present | Present. **Don't follow it.** | Out of scope target |
| DET-123 | Report row click | — | — | A host with reports | — | Goes to `/hosts/:id/reports/:qid`. | Out of scope target |
