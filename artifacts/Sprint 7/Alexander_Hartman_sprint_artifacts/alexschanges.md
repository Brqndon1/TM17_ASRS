# Worklog — Performance Dashboard & Budget Feature

## `src/components/Header.js`
- Added `PerformanceDropdown` component modelled on the existing `HistoryDropdown` pattern
- Replaced the flat `<Link href="/performance-dashboard">` with `<PerformanceDropdown>` inside the `isStaffOrAdmin` block
- Dropdown highlights when `pathname` starts with `/performance` or `/performance-dashboard`
- Each subtab (Goals, Budget) highlights independently based on its own path prefix
- No other spacing, layout, or logic changes made

---

## `src/app/performance/goals/page.js` *(new file)*
- Created at new canonical path `/performance/goals`
- Content moved from `src/app/performance-dashboard/page.js` with no logic changes
- Page title updated to "Performance — Goals"

---

## `src/app/performance-dashboard/page.js`
- Replaced with a client-side redirect shim using `router.replace('/performance/goals')`
- Preserves backwards compatibility for any existing bookmarks or hardcoded links

---

## `src/app/performance/budget/page.js` *(new file)*
- Created new page at `/performance/budget` implementing US-016 (View Budget Performance)
- **Summary stats:** Total Allocated, Top Category, initiatives with budget set, Personnel Share
- **Filters:**
  - Initiative name search (client-side)
  - Fiscal year dropdown (server-side re-fetch)
  - Department dropdown (server-side re-fetch)
  - Clear filters button (shown only when a filter is active)
- **Stacked bar chart:** Personnel / Equipment / Operations / Travel per initiative using Recharts
- **Sortable table:** cycles through Total (high→low), Total (low→high), A→Z, Z→A, Personnel, Operations
- **Proportional `CategoryBar` component:** inline segment bar showing budget category split per row
- **Drill-down rows:** clicking a row fetches and expands per-fiscal-year breakdown and last 20 change history entries (with changed-by user name) inline beneath the row
- Count row updated to show "Showing X of Y initiatives"
- Fixed React key prop warning by replacing shorthand `<>` fragments with `<React.Fragment key={...}>` in mapped table rows

---

## `src/app/api/performance/budget/route.js` *(new file)*
- Created new GET endpoint at `/api/performance/budget`
- Auth protected via `requireAccess` with `minAccessRank: 50`
- **Default mode:** LEFT JOINs `initiative_budget` onto `initiative` so initiatives with no budget still appear; aggregates personnel, equipment, operations, travel, and total across fiscal years per initiative
- **Filter params:** `fiscalYear` and `department` applied server-side as WHERE conditions
- **Drill-down mode:** triggered by `initiativeId` param; returns per-year budget entries and last 20 `initiative_budget_history` records with the name of the user who made each change
- Returns available `fiscalYears` and `departments` arrays for populating filter dropdowns
- Fixed folder typo: `peformance` → `performance`

---

## `src/lib/db.js`
- Added budget seed block using `INSERT OR IGNORE INTO initiative_budget`
- Seed block placed **after** the initiative upsert loop to satisfy foreign key constraints
- Initiative names updated to match actual seeded data:
  - Amazon Product Reimagining
  - Bags2School Initiative
  - Drive Safe Robotics
  - E-Gaming and Careers
  - ELA Achievement & Attendance
  - Organization Proposals
  - PSLA Modified Track Team
- Seeds 2024 and 2025 fiscal year entries with dummy personnel, equipment, operations, and travel figures across General, Operations, HR, IT, and Finance departments