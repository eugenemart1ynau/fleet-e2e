# Hosts page: Selection and bulk delete

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 18 (HST-150 – HST-167)  
**Source section:** §2.10 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.10 Selection and bulk delete

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-150 | Select one row | P1 | Happy | PC-C | 1. Click the row checkbox (`tr:has(a:text("<name>")) [role=checkbox]`) | `aria-checked=true`. The header becomes "1 selected", Clear selection, **Delete** and Run script. **No** Transfer. | [AUTO] |
| HST-151 | Select several rows | P1 | Happy | PC-A | 1. Check 2 rows | "2 selected". The header checkbox is `aria-checked="mixed"`. | [AUTO] |
| HST-152 | Select all on the page | P1 | Boundary | PC-A | 1. Click the header checkbox | All rows are checked. "N selected" / "All hosts on this page are selected". **No** "Select all matching hosts" (< 50). | [AUTO] |
| HST-153 | Clear selection | P1 | Happy | after HST-151 | 1. Click "Clear selection" | Nothing is selected and the normal header comes back. | [AUTO] |
| HST-154 | Uncheck the header | P2 | Happy | after HST-152 | 1. Click the header checkbox again | Nothing is selected. | |
| HST-155 | Modal copy: 1 host | P1 | Happy | PC-C selected | 1. Click Delete | "Delete" modal: "This will remove all host data such as unlock PINs and disk encryption keys." / "This host will re-enroll unless Fleet's agent is uninstalled. Learn more". Delete + Cancel. | [AUTO] |
| HST-156 | Modal copy: N Linux hosts | P1 | Happy | 2 Linux hosts selected | 1. Click Delete | "This will remove **2 hosts** and associated data…" / "These hosts will re-enroll…". | [AUTO] |
| HST-157 | Modal copy: mixed platforms | P2 | Edge | macOS + Linux selected | 1. Click Delete | The generic, bulleted mixed-platform copy. | |
| HST-158 | Cancel / X / Esc is non-destructive | P0 | Negative | 2 hosts selected | 1. Click Delete<br>2. Cancel (repeat with X and Esc) | The modal closes. **No** `POST /hosts/delete`. The hosts remain in the UI and the API. Record whether the selection is kept. | [AUTO-P0] [API] |
| HST-159 | Confirm bulk delete | P1 | Happy | 2 simulated Linux hosts selected | 1. Click Delete<br>2. Confirm Delete | Loading state. `POST /hosts/delete {ids:[a,b]}`. Toast "Hosts successfully deleted." Selection reset. List and count refetched. `GET /hosts/a` and `/b` return **404** right afterwards. | [AUTO] [DESTRUCTIVE] [API] |
| HST-160 | Re-enrollment after bulk delete | P2 | Edge | after HST-159 | 1. Wait 1–2 check-ins<br>2. Reload | The hosts come back (maybe with **new ids**), as the copy promises. Not a bug. | [CAUTION] |
| HST-161 | Double-click confirm | P2 | Edge | 1 host selected | 1. Double-click Delete in the modal | A single request (the loading state disables the button). No error toast. | [DESTRUCTIVE] |
| HST-162 | Bulk delete fails | P2 | Error | Mock `POST /hosts/delete` with a 500 | 1. Confirm | Toast "Could not delete hosts. Please try again." The hosts remain. | [AUTO] (route mock) |
| HST-163 | Delete every host on the page | P2 | Boundary | All selected | 1. Confirm | Empty state or last valid page, with no crash. Hosts re-enroll later. | [DESTRUCTIVE] [CAUTION] run last |
| HST-164 | Selection vs a changed search | P2 | Edge | 1 selected | 1. Type a search that excludes the selected host | Record whether the selection is cleared or kept. A delete must never hit hidden hosts without a visible "N selected". | QQ16 |
| HST-165 | "Select all matching hosts" | P2 | Boundary | ≥ 50 selected | 1. Select all<br>2. Click "Select all matching hosts"<br>3. Delete | `POST /hosts/delete {filters:{…}}`. | **N/A (data)** |
| HST-166 | Transfer action | — | — | — | — | Must be absent on free (checked in HST-150). | **N/A (Premium)** |
| HST-167 | Run script bulk action | — | — | — | — | Present. **Don't run it.** | **Out of scope** |
