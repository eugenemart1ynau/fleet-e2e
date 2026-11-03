# Hosts page: Sorting

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 12 (HST-090 – HST-101)  
**Source section:** §2.5 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.5 Sorting

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-090 | Default sort: Host ascending | P1 | Happy | PC-A | 1. Load the page | Rows are ordered by `display_name` ascending, equal to the API order. | [AUTO] [API] |
| HST-091 | Host descending | P1 | Happy | PC-A | 1. Click the Host header | URL `order_direction=desc`. Rows are reversed and match the API. | [AUTO] [API] |
| HST-092 | Sort by Operating system | P1 | Happy | PC-A | 1. Click the OS header twice | `order_key=os_version`, asc then desc. Matches the API. | [AUTO] [API] |
| HST-093 | "Time ago" column direction | P1 | Edge | PC-A | 1. Sort Last fetched asc, then desc | The direction is inverted at the API boundary, so the visible order reads naturally (verify against the relative-time text). | [AUTO] QQ11 |
| HST-094 | Status isn't sortable | P2 | Negative | PC-A | 1. Click the Status header | No sort button and no URL change. | |
| HST-095 | Disk / Agent / Last restarted sort | P2 | Happy | PC-A | 1. Sort each one | `order_key` updates. Matches the API. | |
| HST-096 | Deep link sort | P1 | Happy | PC-A | 1. Open `?order_key=os_version&order_direction=desc` | The table is sorted accordingly and the header shows the sort indicator. | [AUTO] |
| HST-097 | Invalid `order_key` | P1 | Negative | PC-B | 1. Open `?order_key=bogus&order_direction=asc` | The API returns **422** "invalid order_key". The UI should fall back to the default sort or show DataError. Never a blank or crashed page. | [AUTO] QQ12 |
| HST-098 | Invalid `order_direction` | P2 | Negative | PC-B | 1. Open `?order_key=display_name&order_direction=sideways` | Graceful (default direction or an error state). | QQ12 |
| HST-099 | Sort survives search and filter | P2 | Happy | PC-A | 1. Sort OS desc<br>2. Search<br>3. Choose Online | The sort is kept in the URL and in the results. | [AUTO] |
| HST-100 | Sort button accessible name | P2 | A11y | PC-A | 1. Inspect the a11y tree of the sort buttons | Expected: "Sort by Host ascending" etc. Suspected: "Sort by [object Object]" or function text, because the header is a function. | [BUG?] QQ13 |
| HST-101 | Issues sorts descending first | P2 | Edge | Issues column shown | 1. Click the Issues header once | `order_direction=desc` on the first click. | |
