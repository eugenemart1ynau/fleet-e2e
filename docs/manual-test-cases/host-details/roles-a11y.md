# Host details page: Roles and accessibility

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 5 (DET-140 – DET-144)  
**Source section:** section 3.12 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.12 Roles and accessibility

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-140 | Observer is read-only | P1 | Negative | PC-F | 1. Open details as Observer | All tabs can be viewed. No Delete. Record Refetch availability. | [AUTO] QQ23 |
| DET-141 | Maintainer can delete | P2 | Happy | PC-F | 1. Open Actions | Delete is present. | |
| DET-142 | axe scan of each tab | P2 | A11y | PC-C | 1. Run axe on each tab | No critical violations. | [AUTO] |
| DET-143 | Keyboard: tabs and Actions | P2 | A11y | PC-C | 1. Use the arrow keys/Enter on the tabs<br>2. Open Actions with the keyboard | Can be operated, with visible focus. | |
| DET-144 | Delete modal semantics | P2 | A11y | PC-C | 1. Open the Delete modal | Focus moves into it. Note: no `role=dialog`, and the X has no accessible name. | [BUG?] QQ17 |
