# Host details page: Actions menu

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 7 (DET-050 – DET-056)  
**Source section:** section 3.5 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.5 Actions menu

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-050 | Free admin, Linux host | P1 | Happy | PC-C | 1. Open "Actions" | The `data-testid=dropdown-option` items are Live report, Run script and Delete. There's **no** Transfer, Lock, Wipe, Unlock, Clear passcode, disk key or Turn off MDM. | [AUTO] |
| DET-051 | Free admin, macOS host | P2 | Happy | macOS host | 1. Open Actions | The free set. MDM items only if MDM-enrolled. Record the options. | |
| DET-052 | Live report disabled offline | P2 | Negative | PC-E | 1. Open Actions on the offline host | Live report is disabled: "You can't run a live report on an offline host." Don't click it. | Visibility only |
| DET-053 | Run script present | — | — | PC-C | 1. Check that it's present | Present, or disabled if scripts are disabled. **Don't run it.** | **Out of scope** |
| DET-054 | Close without choosing | P2 | Negative | PC-C | 1. Open Actions<br>2. Press Esc or click outside | The menu closes and nothing is triggered. | |
| DET-055 | Observer Actions | P2 | Negative | PC-F | 1. Open a host as Observer / Observer+ | No Delete. The menu is hidden when no options are available. | |
| DET-056 | Premium/MDM actions | — | — | — | — | Transfer, Lock, Wipe, Unlock, Clear passcode, Show disk encryption key, Recovery Lock, Release from ABM, Turn off MDM | **N/A (Premium/MDM)** |
