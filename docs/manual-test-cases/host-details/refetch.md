# Host details page: Refetch

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 7 (DET-040 – DET-046)  
**Source section:** section 3.4 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.4 Refetch

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-040 | Refetch an online host | P1 | Happy | PC-C | 1. Click "Refetch" | `POST /hosts/:id/refetch`. The button becomes "Fetching fresh vitals...this may take a moment" (disabled). `GET /hosts/:id` is polled every ~2 s. When `refetch_requested` clears, the button reads "Refetch" again and "Last fetched" updates. | [AUTO] [API] |
| DET-041 | Disabled when offline | P1 | Negative | PC-E | 1. Open the offline host<br>2. Hover Refetch | Disabled, with the tooltip "You can't fetch data from an offline host." | [AUTO] |
| DET-042 | Host goes offline mid-refetch | P2 | Edge | PC-C | 1. Click Refetch<br>2. Immediately `docker stop` the host | Toast "This host is offline. Please try refetching host vitals later." The button resets. | [CAUTION] timing |
| DET-043 | 60 s timeout | P2 | Boundary | Mock `GET /hosts/:id` to keep `refetch_requested=true` | 1. Refetch<br>2. Wait 60 s (or fast-forward the clock) | Toast "Refetch sent but vitals are taking longer than expected to load. You'll see an update when the host responds." | [AUTO] (route mock + clock) |
| DET-044 | Refetch POST fails | P2 | Error | Mock POST refetch with a 500 | 1. Click Refetch | Toast `Host "<name>" <reason>`. The button resets. | [AUTO] (route mock) |
| DET-045 | Double-click | P2 | Edge | PC-C | 1. Double-click Refetch | Only one POST. | |
| DET-046 | Leave the page mid-refetch | P2 | Edge | PC-C | 1. Refetch<br>2. Click Back to all hosts | Polling stops, with no console errors and no stray toasts. | |
