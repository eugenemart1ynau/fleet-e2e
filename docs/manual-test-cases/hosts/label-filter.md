# Hosts page: Label and platform filter

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 16 (HST-070 – HST-085)  
**Source section:** §2.4 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.4 Label and platform filter

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-070 | Dropdown groups | P1 | Happy | PC-B | 1. Open "Filter by platform or label" | A "Platforms" group: built-in platform labels **excluding** All Hosts, Red Hat Linux, CentOS Linux and Ubuntu Linux. A "Labels" group: regular labels. There's an in-menu "Filter by label name" search and an "Add label" button. | 🤖 |
| HST-071 | Platform filter: All Linux | P1 | Happy | PC-A | 1. Choose "All Linux" | URL `/hosts/manage/labels/<id>`. Only Linux hosts are listed. Count = `GET /labels/<id>/hosts`. **No pill** is shown. | 🤖 🔌 |
| HST-072 | Platform filter: macOS | P1 | Happy | PC-A | 1. Choose "macOS" | Only the macOS host is listed. | 🤖 |
| HST-073 | Regular label shows a pill | P1 | Happy | PC-A | 1. Choose "Debian-based Linux hosts" | The list is filtered. A pill is shown with `role=status`, aria-label "hosts filtered by Debian-based Linux hosts", and a "Remove … filter" button. | 🤖 |
| HST-074 | Remove the pill | P1 | Happy | after HST-073 | 1. Click the pill's remove button | Back to `/hosts/manage`, `page=0`. Full list. | 🤖 |
| HST-075 | Label with 0 hosts | P1 | Boundary | PC-B | 1. Choose "MS Windows" | Filtered empty state. Controls stay enabled. | 🤖 |
| HST-076 | In-menu label search | P2 | Happy/Negative | PC-B | 1. Type "Debian"<br>2. Type "zzz" | Step 1 filters the options. Step 2 shows "No matching labels". | |
| HST-077 | "Add label" control | P2 | Happy | PC-B | 1. Check that it's present | Visible (aria-label "Add label"). **Don't follow it.** | Out of scope target |
| HST-078 | Deep link to a label path | P1 | Happy | PC-B | 1. Open `/hosts/manage/labels/<regular id>` | The filter is applied, the select shows the label and the pill is shown. | 🤖 |
| HST-079 | Non-existent label id | P1 | Negative | PC-B | 1. Open `/hosts/manage/labels/999999` | Graceful handling (error state or redirect). No crash or blank page. Record which. | ❓Q9 |
| HST-080 | Non-numeric label id | P2 | Negative | PC-B | 1. Open `/hosts/manage/labels/abc` | Graceful, no crash. | ❓Q9 |
| HST-081 | Label + status + search | P1 | Happy | PC-A | 1. Choose a label, Online, and a substring search | Results are the intersection. The URL has the label path plus `status` and `query`. Matches the API. | 🤖 🔌 |
| HST-082 | Pill Edit/Delete icons (admin) | P2 | Happy | after HST-073 | 1. Inspect the pill | "Edit label" and "Delete label" are visible for a global admin. Edit isn't followed (out of scope). | |
| HST-083 | Delete label: Cancel | P2 | Negative | after HST-073 | 1. Delete label<br>2. Cancel | The modal closes, the label still exists (`GET /labels`) and the filter stays. | |
| HST-084 | Delete label: Confirm | P2 | Happy | A throwaway custom label created by API | 1. Filter by it<br>2. Delete label<br>3. Confirm | Toast "Successfully deleted label." The list is unfiltered and `GET /labels` no longer has it. | 💥 ❓Q10 |
| HST-085 | Choosing a label strips incompatible params | P2 | Edge | PC-B | 1. Open `?policy_id=1&software_id=1`<br>2. Choose a label | The policy, software and similar params are removed from the URL. | |
