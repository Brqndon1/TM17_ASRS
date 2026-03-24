# Sprint 6 — Staff navigation (Distribute, Goals, Performance)

## Summary

Sprint 6 extended the main header navigation so **staff** users see the same **Distribute**, **Goals**, and **Performance** links as administrators, while **User Management** remains **admin-only**. The home page already listed these tools under “Staff Tools”; this change aligns the persistent top nav with that expectation and removes an inconsistent “tabs only for admin” experience.

## Problem

- **Distribute**, **Goals**, and **Performance** were gated behind `isAdmin` in `Header.js`, so staff could not reach those areas from the header even though they are staff workflows.
- The **Goals** page (`src/app/goals/page.js`) redirected anyone who was not `admin` to the home page, so staff hitting `/goals` directly would be blocked.

## Work completed

- **`src/components/Header.js`**
  - Introduced `isStaffOrAdmin` (`user_type === 'staff' || user_type === 'admin'`).
  - Show **Distribute** when `isStaffOrAdmin`.
  - Show **Goals** and **Performance** when `isStaffOrAdmin`.
  - Show **User Management** only when `isAdmin`.
  - Updated the file header comment to describe the new behavior.

- **`src/app/goals/page.js`**
  - Client access check now allows **staff** and **admin** (aligned with **Performance** and **Survey distribution** pages).
  - Unauthenticated users still redirect to `/login`; other roles still redirect to `/`.

## Related behavior (unchanged)

- **`/survey-distribution`** — Already allowed staff in its auth check.
- **`/performance-dashboard`** — Already allowed staff.
- **Goals APIs** — Use `requireAccess` with `minAccessRank: 50`, consistent with staff access rank.

## Validation

- Manual test as **staff**: confirm **Distribute**, **Goals**, and **Performance** appear in the header and pages load without redirect to Home.
- Spot-check **admin**: **User Management** still visible; staff-only tabs still visible.

## Impact

- Staff can use the primary navigation to reach distribution, goals, and performance workflows without asking for admin accounts or bookmarking URLs.
- Role boundaries stay clear: user administration remains admin-only.
