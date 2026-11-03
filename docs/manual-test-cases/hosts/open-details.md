# Hosts page: Navigation to Host details

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 3 (HST-200 – HST-202)  
**Source section:** §2.14 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.14 Navigation to Host details

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-200 | Host name link opens details | P0 | Happy | PC-C | 1. Click the PC-C name link | `/hosts/<id>/details` (no `fleet_id`). H1 = display_name. | [AUTO-P0] |
| HST-201 | Clicking elsewhere in the row doesn't navigate | P1 | Negative | PC-C | 1. Click the OS cell and the Status cell | You stay on `/hosts/manage`. | [AUTO] |
| HST-202 | Open in a new tab | P2 | Edge | PC-C | 1. Cmd/Ctrl-click the name | Details open in a new tab (a real `<a href>`). | |
