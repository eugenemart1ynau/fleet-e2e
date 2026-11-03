# Hosts page: Export hosts (CSV)

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 8 (HST-120 – HST-127)  
**Source section:** §2.7 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.7 Export hosts (CSV)

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-120 | Export downloads a CSV | P1 | Happy | PC-A, PC-D | 1. Click "Export hosts" | A file named `Hosts YYYY-MM-DD.csv` (today) downloads. The request is `GET /hosts/report?format=csv&columns=<visible ids>…`. | 🤖 |
| HST-121 | CSV columns and rows | P1 | Happy | after HST-120 | 1. Open the CSV | Header = the visible columns. Agent becomes `orbit_version,osquery_version`. No `selection` column. Rows = host count. Values match the API. | 🤖 🔌 |
| HST-122 | Export respects search, status and sort | P1 | Happy | PC-A | 1. Search + Online + OS desc<br>2. Export | Only the matching hosts, in that order. The request carries `query`, `status` and `order_*`. | 🤖 |
| HST-123 | Export respects the label | P2 | Happy | PC-A | 1. Filter All Linux<br>2. Export | Linux rows only (`label_id`). | 🤖 |
| HST-124 | Export respects hidden columns | P2 | Happy | after HST-103 | 1. Export | No Agent columns. | 🤖 |
| HST-125 | Export with zero matches | P2 | Boundary | PC-A | 1. Search with no match<br>2. Check/use Export | Record whether it's hidden, disabled, or gives a header-only CSV. | ❓Q14 |
| HST-126 | Export fails | P2 | Error | Mock `/hosts/report` with a 500 | 1. Export | Toast "Could not export hosts. Please try again." No file. | 🤖 (route mock) |
| HST-127 | CSV encoding and escaping | P2 | Edge | macOS host name with `’` and `(2)` | 1. Export<br>2. Open in a text editor | UTF-8 is intact. Fields with commas or quotes are quoted. | |
