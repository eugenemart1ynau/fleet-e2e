# Host details page: Policies tab

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 4 (DET-130 – DET-133)  
**Source section:** §3.11 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.11 Policies tab

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-130 | Empty policies | P1 | Happy | PC-C, fresh preview | 1. Open Policies | "No policies checked" / "Select Refetch to load the latest data from this host, or manage its policies." plus "Manage policies" (not followed). | 🤖 |
| DET-131 | Policies with results | P1 | Happy | Create one passing and one failing global policy by API, then Refetch | 1. Open Policies | "N policies". Each row's pass/fail equals the API `policies[].response`. | 🤖 🔌 |
| DET-132 | Policy details modal | P2 | Happy | after DET-131 | 1. Click a row | A modal opens on the same page with the name, description and resolution. It closes cleanly. | |
| DET-133 | Pending response | P2 | Edge | A new policy, before refetch | 1. View it | The status shows pending/"---" until the host reports. | |
