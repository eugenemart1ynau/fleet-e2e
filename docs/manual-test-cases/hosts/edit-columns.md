# Hosts page: Edit columns

**Page:** `/hosts/manage` (and `/hosts/manage/labels/:id`)  
**Cases:** 10 (HST-102 – HST-111)  
**Source section:** section 2.6 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 2.6 Edit columns

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| HST-102 | Modal reflects the current state | P1 | Happy | PC-D | 1. Click "Edit columns" | "Edit columns" / "Choose which columns you see:". One checkbox per column (aria-label = title), checked = visible. Host isn't listed. Fleet and MDM aren't listed. Save and Cancel buttons. | [AUTO] |
| HST-103 | Hide a column + Save | P1 | Happy | PC-D | 1. Uncheck "Agent"<br>2. Save | The modal closes and Agent is gone. `PATCH /users/:id` sends `hidden_host_columns` including it. No toast. | [AUTO] [API] |
| HST-104 | Persists after reload and re-login | P1 | Happy | after HST-103 | 1. Reload<br>2. Log out and back in | Still hidden. `GET /me` `settings.hidden_host_columns` matches. | [AUTO] [API] |
| HST-105 | Show a default-hidden column | P1 | Happy | PC-D | 1. Check "Hostname" (or Serial number)<br>2. Save | The column appears and its values match the API. | [AUTO] [API] |
| HST-106 | Cancel / X / Esc discards changes | P1 | Negative | PC-D | 1. Toggle checkboxes<br>2. Cancel (repeat with X and Esc) | The table is unchanged and there's no PATCH. Reopening shows the original state. | [AUTO] |
| HST-107 | Save fails | P2 | Error | Mock PATCH `/users/:id` with a 500 | 1. Uncheck a column<br>2. Save | Toast "Couldn't save column settings. Please try again." The modal **stays open** and the table is unchanged. | [AUTO] (route mock) |
| HST-108 | Hide every hideable column | P2 | Boundary | PC-D | 1. Uncheck all<br>2. Save | Only selection + Host remain. The Host link still works. | |
| HST-109 | Show every column | P2 | Boundary | PC-D | 1. Check all<br>2. Save | All free columns render (horizontal scroll) with no misaligned cells. | |
| HST-110 | Settings are per user | P2 | Edge | PC-F | 1. As admin, hide Agent<br>2. Log in as Maintainer | The Maintainer still sees Agent. | |
| HST-111 | Disabled on a truly empty instance | P2 | Boundary | 0 hosts (see HST-131) | 1. Load the page | Edit columns is disabled. | [CAUTION] |
