# Host details page: Software tab (Inventory)

**Page:** `/hosts/:id/{details,software,reports,policies}`  
**Cases:** 18 (DET-100 – DET-117)  
**Source section:** §3.9 of the original `MANUAL_TEST_CASES.md`

> Preconditions (PC-A … PC-F), priority/type definitions, notes tags ([AUTO] [API] [DESTRUCTIVE] [CAUTION] [BUG?]) and open questions (QQn) are defined in the [index](../README.md): see [Conventions](../README.md#14-conventions) and [Open product questions](../README.md#5-open-product-questions).

## 3.9 Software tab (Inventory)

| ID | Title | Pri | Type | Preconditions | Steps | Expected result | Notes |
|---|---|---|---|---|---|---|---|
| DET-100 | Inventory list and count | P0 | Happy | PC-C (Linux with software) | 1. Open Software | Count "N items" = the API `count` from `/hosts/:id/software`. Columns: Name, Installed version, Type, Last opened, Vulnerabilities, File path/Hash. **No** Library sub-tab. | [AUTO-P0] [API] |
| DET-101 | First page = API (20 per page, name ascending) | P1 | Happy | PC-C | 1. Compare the first 20 names | Same names and order as `?per_page=20&order_key=name&order_direction=asc`. | [AUTO] [API] |
| DET-102 | Search by name | P0 | Happy | PC-C | 1. Type a known package (e.g. `bash`) in "Search by name or vulnerability (CVE)" | After about 500 ms the results match the API with `query`. URL `?query=bash`. | [AUTO-P0] [API] |
| DET-103 | Search with no match | P0 | Negative | PC-C | 1. Search for `zzz-no-such-pkg` | "No items match the current search criteria". | [AUTO-P0] |
| DET-104 | Search by CVE | P2 | Happy | A host with vulnerabilities | 1. Search a CVE id | The matching software is listed. Mark **N/A (data)** if vulnerability processing hasn't run. | [CAUTION] |
| DET-105 | Trim, case and special characters | P2 | Edge | PC-C | 1. Search `  BASH  `<br>2. Search `%`<br>3. Search `<script>` | Case-insensitive trimmed match. Literal special characters, no errors. | |
| DET-106 | Sort by Name | P1 | Happy | PC-C | 1. Click the Name header | URL `order_key=name&order_direction=desc`. Reversed, and matches the API. | [AUTO] [API] |
| DET-107 | Pagination | P1 | Boundary | PC-C with > 20 items | 1. Next<br>2. Previous | URL `page=1` with 20 different items. Previous is disabled on page 0 and Next on the last page (`meta.has_next_results`). | [AUTO] [API] |
| DET-108 | Deep link search + page | P2 | Happy | PC-C | 1. Open `/hosts/<id>/software/inventory?query=lib&page=1` | Pre-filled, and the page is respected. | |
| DET-109 | Filter: vulnerable only | P2 | Happy | PC-C | 1. Add filters → vulnerable → Apply | The button reads "Filtered". The list shows vulnerable software only (or the empty state). | |
| DET-110 | Filter by type | P2 | Happy | PC-C | 1. Filter by a type (e.g. deb packages) | Only that type is listed. | |
| DET-111 | Reset filters | P2 | Happy | after DET-109 | 1. Clear the filters | The full list comes back and the button reads "Add filters". | |
| DET-112 | Host with no software | P2 | Boundary | Mock an empty response, or a freshly enrolled host | 1. Open Software | "No software found" / "Expecting to see software? Check back later." | [AUTO] (route mock) [CAUTION] |
| DET-113 | Inventory disabled | P2 | Negative | Set `features.enable_software_inventory=false` by API (restore it after) | 1. Open Software | "Software inventory disabled". | Environment-altering |
| DET-114 | Software name link | — | — | PC-C | 1. Check that it's present | A link to the software title page. **Don't follow it.** | Out of scope target |
| DET-115 | macOS types + "Show helpers" | P2 | Edge | macOS host | 1. Open Software | The URL is normalized to App (macOS). The "Show helpers" toggle changes the list. | |
| DET-116 | Software Library | — | — | — | — | — | **N/A (Premium)** |
| DET-117 | Invalid software URL params | P2 | Negative | PC-C | 1. Open `?page=-1`<br>2. Open `?order_key=bogus` | Graceful fallback or error state, never a blank page. | QQ12 |
