# Hosts page: Roles and permissions / Accessibility smoke

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 9 (HST-180 – HST-194)  
**Source section:** section 2.12, section 2.13 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.12 Roles and permissions

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-180 | Maintainer | P2 | Happy | PC-F | 1. Log in as Maintainer<br>2. Open Hosts | Checkboxes, bulk Delete and Add hosts are visible. | |
| HST-181 | Observer is read-only | P1 | Negative | PC-F | 1. Log in as Observer<br>2. Open Hosts | **No** row checkboxes, no bulk actions and no Add hosts. Search, filters, sort and export work. | [AUTO] |
| HST-182 | Observer+ | P2 | Negative | PC-F | 1. Log in as Observer+ | Same host-management restrictions as Observer. | |
| HST-183 | Observer can't delete through the API | P2 | Negative | PC-F | 1. As Observer, `POST /hosts/delete` | 403. | [API] |

## 2.13 Accessibility smoke

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-190 | Keyboard operation | P2 | A11y | PC-A | 1. Tab through the search, selects, headers and host links<br>2. Press Enter on a link | Focus is visible. The selects work from the keyboard. Enter opens details. | |
| HST-191 | Modal focus and Esc | P2 | A11y | PC-A | 1. Open Edit columns / Delete with the keyboard<br>2. Press Esc | Focus moves into the modal and Esc closes it. Note the missing `role="dialog"`/`aria-modal` and the unnamed close X. | [BUG?] QQ17 |
| HST-192 | Row checkbox name | P2 | A11y | PC-A | 1. Inspect a row checkbox | Currently it has no accessible name. Expected: "Select <host>". | [BUG?] |
| HST-193 | Search input label | P2 | A11y | PC-A | 1. Inspect the input | Placeholder only, with no label or aria-label. | [BUG?] |
| HST-194 | axe scan | P2 | A11y | PC-A | 1. Run `@axe-core/playwright` on `/hosts/manage` | No critical violations. Record the serious ones. | [AUTO] |
