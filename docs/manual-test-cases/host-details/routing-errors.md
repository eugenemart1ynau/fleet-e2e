# Host details page: Routing and errors

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 15 (DET-001 – DET-015)  
**Source section:** §3.1 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.1 Routing and errors

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-001 | `/hosts/:id` redirects to `/details` | P1 | Happy | PC-C | 1. Open `/hosts/<id>` | The URL becomes `/hosts/<id>/details` and the Details tab is selected. | 🤖 |
| DET-002 | Deep link to each tab | P1 | Happy | PC-C | 1. Open `/details`, `/software`, `/reports` and `/policies` directly | The matching tab is selected. `/software` normalizes to `/software/inventory`. | 🤖 |
| DET-003 | Tab clicks update the URL | P1 | Happy | PC-C | 1. Click Software → Reports → Policies → Details | The path updates on each click (history push). The query string is dropped. | 🤖 |
| DET-004 | Back/Forward across tabs | P2 | Edge | after DET-003 | 1. Press browser Back ×3, then Forward | The tab and content follow the URL. | |
| DET-005 | Non-existent id shows a 404 | P0 | Negative | PC-B | 1. Open `/hosts/99999999/details` | The Fleet 404 page: H1 "404: We can't find that page!". No partial host UI. (The API returns 404.) | 🤖P0 🔌 |
| DET-006 | Non-numeric id | P1 | Negative | PC-B | 1. Open `/hosts/abc/details` | A 404 or 500 page, never blank or crashed. Record which. | 🤖 ❓Q18 |
| DET-007 | Id 0, negative, or overflow | P2 | Boundary | PC-B | 1. Open `/hosts/0`<br>2. Open `/hosts/-1`<br>3. Open `/hosts/99999999999999999999` | A graceful 404 or error page each time. | ❓Q18 |
| DET-008 | Deleted host's old URL | P1 | Negative | after DET-062 | 1. Open the old URL | 404, unless it re-enrolled under the same id (record which). | 🤖 ⚠️ |
| DET-009 | `/hosts/:id/scripts` | P2 | Edge | PC-C | 1. Open the path | The Details content renders and there's no Scripts tab. Nothing is run. | Route check only (scripts are out of scope) |
| DET-010 | `/hosts/:id/controls` on free | P2 | Negative | PC-C | 1. Open the path | No Controls tab. Record whether it redirects or renders empty. | N/A (MDM) ❓Q19 |
| DET-011 | Unknown sub-path | P2 | Negative | PC-C | 1. Open `/hosts/<id>/bogus` | 404 page. | |
| DET-012 | Unauthenticated deep link | P1 | Negative | Logged out | 1. Open `/hosts/<id>/details` | You're redirected to login. Record whether you return to the host after logging in. | ❓Q20 |
| DET-013 | Host API 500 | P2 | Error | Mock `GET /hosts/:id` with a 500 | 1. Load details | The Fleet500 error page. | 🤖 (route mock) |
| DET-014 | Loading spinner | P2 | Happy | Throttled network | 1. Load details | A spinner shows until the host and activities load. | |
| DET-015 | Document title | P2 | Happy | PC-C | 1. Read the title | `<display_name> \| Hosts \| Fleet`. | 🤖 |
