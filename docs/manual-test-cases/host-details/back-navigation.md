# Host details page: Back to all hosts

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 5 (DET-020 – DET-024)  
**Source section:** section 3.2 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.2 Back to all hosts

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-020 | Back keeps search, status and sort | P1 | Happy | PC-A | 1. On Hosts, search + Online + sort OS desc<br>2. Open a host<br>3. Click "Back to all hosts" | The same URL params come back, the input is pre-filled and the list is filtered. | [AUTO] |
| DET-021 | Back keeps the label path | P2 | Happy | PC-A | 1. Filter by a label<br>2. Open a host<br>3. Back | You return to `/hosts/manage/labels/<id>…`. | [AUTO] |
| DET-022 | Back without history | P1 | Edge | PC-C | 1. Open the details URL in a fresh tab<br>2. Click Back to all hosts | You go to `/hosts/manage` (the fallback). | [AUTO] |
| DET-023 | Back after switching tabs | P2 | Edge | after DET-020 | 1. Open a host → Software → Back to all hosts | The filters are still restored. | |
| DET-024 | Back is a button | P2 | A11y | PC-C | 1. Inspect it | A `<button>` that can be activated from the keyboard (not a link, so there's no open-in-new-tab). | |
