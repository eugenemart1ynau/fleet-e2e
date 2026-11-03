# Host details page: Header and summary

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 9 (DET-030 – DET-038)  
**Source section:** §3.3 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.3 Header and summary

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-030 | H1 = display_name | P0 | Happy | PC-C | 1. Open details | H1 `.display-name` = the API `display_name`. | 🤖P0 🔌 |
| DET-031 | Status matches the API | P0 | Happy | PC-C | 1. Read Status in the summary | "Online" (capitalized) = the API `status`. | 🤖P0 🔌 |
| DET-032 | Offline status | P1 | Happy | PC-E | 1. Open the offline host | Status shows "Offline". | 🤖 |
| DET-033 | Last fetched | P1 | Happy | PC-C | 1. Read the header | "Last fetched <time ago>", consistent with max(`detail_updated_at`, `policy_updated_at`). | |
| DET-034 | Issues only when > 0 | P2 | Boundary | A host with 0 issues vs a host with a failing policy (create the policy by API) | 1. Compare the two | Issues is hidden at 0 and shown with a count at > 0. | |
| DET-035 | Premium summary fields are absent | P2 | Negative | PC-C | 1. Inspect the summary | No Fleet, Patch deadline or Scheduled maintenance. | N/A (Premium) |
| DET-036 | Online history modal | P2 | Happy | PC-C | 1. Click the Status value | An "Online history" modal opens, showing history or "No online history yet." It closes with X/Esc. | |
| DET-037 | No device-status tag | P2 | Negative | PC-C | 1. Inspect the header | No lock or wipe tag. | N/A (MDM) |
| DET-038 | Empty display name | P2 | Edge | A host with an empty name | 1. View it | H1 "---". | N/A (data) |
