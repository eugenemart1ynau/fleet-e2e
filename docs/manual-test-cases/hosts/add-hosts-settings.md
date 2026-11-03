# Hosts page: Add hosts, enroll secrets and the gear menu

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 9 (HST-168 – HST-176)  
**Source section:** §2.11 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags (🤖 🔌 💥 ⚠️ 🐞) and open questions (❓Qn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.11 Add hosts, enroll secrets and the gear menu

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-168 | Add hosts modal opens | P1 | Happy | PC-B | 1. Click "Add hosts" | "Add hosts" with tabs macOS, Windows, Linux, ChromeOS, iOS & iPadOS, Android, Advanced. `fleetctl package` instructions with copy buttons. | 🤖 |
| HST-169 | Switch Add hosts tabs | P2 | Happy | after HST-168 | 1. Click each tab | The content changes per platform with no errors. | |
| HST-170 | Copy a command | P2 | Happy | after HST-168 | 1. Click copy | "Copied" feedback, and the clipboard holds the command. | |
| HST-171 | Close Add hosts | P2 | Negative | after HST-168 | 1. Close with X / Esc / Done | The modal closes. The URL and list are unchanged. | |
| HST-172 | Deep link `?add_hosts=1` | P2 | Happy | PC-B | 1. Open `/hosts/manage?add_hosts=1` | The modal opens and the param is removed from the URL. | 🤖 |
| HST-173 | Gear menu (free) | P2 | Happy | PC-B | 1. Open "Hosts page settings" | Enroll secrets; Custom host vitals (out of scope target); "Activity automations" **disabled** with the tooltip "Activity automations are available in Fleet Premium." | 🤖 |
| HST-174 | Enroll secrets modal | P2 | Happy | PC-B | 1. Gear → Enroll secrets | Lists the global secret (masked or revealable). Closes cleanly. | |
| HST-175 | Deep link `?manage_enroll_secrets=1` | P2 | Happy | PC-B | 1. Open with the param | The secrets modal opens and the param is removed. | |
| HST-176 | No-enroll-secret banner | P2 | Edge | Remove all global secrets (restore them afterwards) | 1. Load Hosts<br>2. Open Add hosts | Yellow banner "You have no enroll secrets. New hosts will not enroll until an enroll secret is added to Fleet." with "Add enroll secret". The modal shows "You have no enroll secrets." | 💥 environment-altering; run last |
