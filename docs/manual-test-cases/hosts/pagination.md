# Hosts page: Pagination

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 3 (HST-140 – HST-142)  
**Source section:** section 2.9 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.9 Pagination

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-140 | 50 per page, Next/Previous | P2 | Boundary | ≥ 51 hosts | 1. Load the page<br>2. Click Next, then Previous | 50 rows on page 0, the rest on page 1. The URL `page` updates. Previous is disabled on the first page and Next on the last. | **N/A (data)**. Possible with osquery-perf hosts or a mock. |
| HST-141 | Exactly 50 hosts | P2 | Boundary | 50 hosts | 1. Load the page | A single page. Next is disabled, or shows "No more hosts to display". | N/A (data) |
| HST-142 | Selection across pages | P2 | Edge | ≥ 51 hosts | 1. Select rows<br>2. Go to the next page | Record whether the selection is cleared. | N/A (data) |
