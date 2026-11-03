# Hosts page: Empty states and bad page params

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 6 (HST-128 – HST-134)  
**Source section:** §2.8 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.8 Empty states and bad page params

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-128 | Filtered empty state | P0 | Negative | PC-A | 1. Search with no match (or choose Missing) | `.empty-state` "No hosts match your filters" / "Recently enrolled hosts will appear here after their first check-in." plus Add hosts. Search, status, label and Edit columns stay enabled. | [AUTO-P0] |
| HST-130 | Add hosts from the empty state | P2 | Happy | after HST-128 | 1. Click Add hosts | The Add hosts modal opens (HST-168). | |
| HST-131 | Truly empty instance | P2 | Boundary | 0 hosts: mock `/hosts` and `/hosts/count` as empty (or delete all and stop the agents) | 1. Load with no params | "No hosts" / "Fleet refers to computers, servers, and mobile devices as hosts. Add a host to start seeing data." plus Add hosts. Search, status, label and Edit columns are **disabled**, and Export is disabled. | [AUTO] (route mock) [CAUTION] |
| HST-132 | Past the last page | P2 | Boundary | PC-A | 1. Open `?page=5` | "No more hosts to display" (or it jumps back to the last valid page). | [AUTO] |
| HST-133 | Non-numeric `page` | P2 | Negative | PC-B | 1. Open `?page=abc` | Expected: fall back to page 0. Risk: the UI forwards NaN and the API returns 400 "non-int page value", so DataError would show. | [BUG?] QQ15 |
| HST-134 | Negative `page` | P2 | Negative | PC-B | 1. Open `?page=-1` | Expected: fall back to page 0 (the API returns 400 "negative page value"). | QQ15 |
