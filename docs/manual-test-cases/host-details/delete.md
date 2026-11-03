# Host details page: Delete host (single)

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 9 (DET-060 – DET-068)  
**Source section:** §3.6 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.6 Delete host (single)

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-060 | Delete modal copy | P1 | Happy | PC-C | 1. Actions → Delete | "Delete" modal: "This will remove all host data such as unlock PINs and disk encryption keys." / "This host will re-enroll unless Fleet's agent is uninstalled. Learn more". Delete + Cancel. | 🤖 |
| DET-061 | Cancel / X / Esc is non-destructive | P0 | Negative | PC-C | 1. Open the modal<br>2. Cancel (repeat with X and Esc) | The modal closes, there's **no** `DELETE` request, you stay on details and `GET /hosts/:id` returns 200. | 🤖P0 🔌 |
| DET-062 | Confirm delete | P0 | Happy | PC-C (a simulated Linux host, **not** the Mac) | 1. Actions → Delete → Delete | `DELETE /hosts/:id` returns 200. Toast **`Host "<display_name>" was successfully deleted.`** Redirect to `/hosts/manage`. The host is absent from the list. `GET /hosts/:id` returns **404** right afterwards. | 🤖P0 💥 🔌 |
| DET-063 | Redirect drops the previous filters | P2 | Edge | Opened from `?status=online&query=x` | 1. Delete the host | You land on plain `/hosts/manage` with the defaults, not the filtered URL. | 💥 ❓Q21 |
| DET-064 | Re-enrollment | P2 | Edge | after DET-062 | 1. Wait 1–2 intervals<br>2. Search for the hostname | It re-appears, possibly with a **new id**. The old id stays 404 unless it was reused. | ⚠️ |
| DET-065 | Delete fails | P2 | Error | Mock DELETE with a 500 | 1. Confirm delete | Toast `Host "<name>" could not be deleted.` You stay on the page and the host exists. | 🤖 (route mock) |
| DET-066 | Double-click confirm | P2 | Edge | PC-C | 1. Double-click Delete in the modal | A single DELETE request and no second error toast. | 💥 |
| DET-067 | Concurrent delete (two tabs) | P2 | Edge | The same host open in tabs A and B | 1. Delete in tab A<br>2. In tab B, Actions → Delete → confirm | Tab B shows the "could not be deleted" toast (404), and no crash. Reloading B gives the 404 page. | 💥 |
| DET-068 | Stale tab interactions | P2 | Edge | after DET-067 (tab B) | 1. Click Refetch / switch tabs in B | Graceful error or 404 handling. | |
