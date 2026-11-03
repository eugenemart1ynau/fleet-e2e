# Host details page: Tabs

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 5 (DET-070 – DET-074)  
**Source section:** §3.7 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.7 Tabs

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-070 | Tabs for a Linux host | P0 | Happy | PC-C | 1. Read the `role=tab` items | Details, Software, Reports, Policies. **No** Controls. | 🤖P0 |
| DET-071 | Tabs for the macOS host | P2 | Happy | macOS host | 1. Read the tabs | Details, Software, Reports, Policies (Controls only with MDM). | |
| DET-072 | Policies failing badge | P2 | Boundary | A host with failing policies vs a host with 0 | 1. Compare | Red count = `failing_policies_count`. No badge at 0. | |
| DET-073 | Every tab renders cleanly | P0 | Happy | PC-C | 1. Click each tab | Content or an empty state renders, with no error toast and no DataError. | 🤖P0 |
| DET-074 | Platform-specific hiding | P2 | Edge | An iOS/Android/ChromeOS host | — | Reports is hidden for iOS/iPadOS/Android/ChromeOS. Policies is hidden for iOS/iPadOS/Android. | **N/A (data)** |
