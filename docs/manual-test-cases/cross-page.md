# Cross-page and environment

**Pages:** Hosts ↔ Host details, plus environment/readiness  
**Cases:** 8 (XPG-001 – XPG-008)  
**Source section:** §4 of the original `MANUAL_TEST_CASES.md`

> Preconditions, conventions and open questions are defined in the [index](README.md): see [Conventions](README.md#14-conventions) and [Open product questions](README.md#5-open-product-questions).

## Cases

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| XPG-001 | Fresh-preview readiness | P0 | Happy | `fleetctl preview` just started | 1. Poll `GET /hosts/count` until stable<br>2. Poll Linux host software until > 0 | ≥ 2 hosts, all online. Software is populated within minutes. | [AUTO-P0] (global setup) |
| XPG-002 | UI and API agree after a delete | P1 | Edge | after DET-062 / HST-159 | 1. Compare the list and count with the API | They're equal, and the deleted ids are absent (no stale cache). | [AUTO] [API] |
| XPG-003 | Label count vs rows | P2 | Happy | PC-A | 1. Compare the All Linux filter count with the Linux rows in the unfiltered list | Equal. | [API] |
| XPG-004 | Session across both pages | P1 | Happy | PC-B | 1. Go Hosts → details → Back → reload | You stay logged in throughout. | [AUTO] |
| XPG-005 | Cross-browser sanity | P2 | Happy | PC-A | 1. Run HST-001, 020, 200 and DET-030, 100 in Firefox and WebKit | Same results. | [AUTO] (projects) |
| XPG-006 | Narrow viewport | P2 | Edge | PC-A | 1. Test at 1024 px and 768 px | The tables scroll. Controls and modals stay reachable. | |
| XPG-007 | Data changes while the page is open | P2 | Edge | PC-E | 1. Keep Hosts open<br>2. Stop a container<br>3. Wait<br>4. Check without reloading, then reload | Record whether the status updates without a reload (no live push expected). | QQ24 |
| XPG-008 | Time zone | P2 | Edge | PC-C | 1. Change the OS time zone<br>2. Reload | Relative times are unchanged. Absolute tooltips are in local time. | |
