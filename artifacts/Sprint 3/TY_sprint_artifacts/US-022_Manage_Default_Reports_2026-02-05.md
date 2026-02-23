# US-022 Artifact - Manage Default Reports

## Submission Info
- **Date:** 2026-02-05
- **Story ID:** US-022
- **Title:** Manage Default Reports
- **Depends On:** US-020
- **Owner:** Taeyoon

## What Was Implemented Today
- Added report management capabilities for staff/admin users:
  - Update report definitions
  - Delete reports with confirmation
  - Reorder report display sequence
- Added backend support for report metadata updates, deletion, and reorder persistence.
- Added a dedicated UI page for managing reports and connected it to navigation.

## Acceptance Criteria Coverage
- **Add new reports to system** - Covered by existing `POST /api/reports` flow (already in use from Report Creation).
- **Update existing report definitions** - Implemented via `PUT /api/reports`.
- **Delete reports (with confirmation)** - Implemented via `DELETE /api/reports?id=...` + UI confirm step in manage page.
- **Reorder report display sequence** - Implemented via `PUT /api/reports/reorder` and persisted `display_order`.

## Technical Changes

### Database
- `src/lib/db.js`
  - Added `display_order` column to `reports` table schema.
  - Added compatibility migration for existing DB files:
    - `addColumnIfNotExists('reports', 'display_order INTEGER NOT NULL DEFAULT 0')`
  - Added `REPORT_MANAGE` feature seed with staff-level access rank.

### API
- `src/app/api/reports/route.js`
  - Updated report list sorting to use `display_order ASC, created_at DESC`.
  - Added `PUT` handler for report metadata updates (`name`, `description`, `status`).
  - Added `DELETE` handler for report deletion by report ID.

- `src/app/api/reports/reorder/route.js` (new)
  - Added bulk reorder endpoint:
    - Accepts ordered array of `{ id, display_order }`
    - Applies updates in a single SQLite transaction

### UI
- `src/app/manage-reports/page.js` (new)
  - Added staff/admin-only report management page.
  - Added:
    - Edit modal for report metadata
    - Delete confirmation interaction
    - Up/down controls for sequence reorder
    - Save order action (persists display order)
    - Basic success/error toast feedback

- `src/components/Header.js`
  - Added `Manage Reports` navigation link for logged-in staff/admin users.

- `src/app/page.js`
  - Added `Manage Reports` home card.
  - Added `staffOnly` visibility handling in route filtering logic.

## Validation Performed
- Lint check run for all modified files: **No linter errors**.
- Endpoint sanity checks:
  - `GET /api/reports` returned success.
  - `/manage-reports` route returned HTTP 200.
- Dev server verified running on port 3001.

## Evidence
- **Code files changed:** listed above (DB, API, UI, navigation).
- **Runtime evidence:** Add screenshots in this folder before submission:
  - `manage-reports-page.png`
  - `edit-report-modal.png`
  - `delete-confirmation.png`
  - `reorder-and-save.png`
  - `api-reports-response.png`
- **Git evidence:** Add commit hash/PR link here once pushed.

## Notes / Follow-Up
- Current ordering is global; next improvement is initiative-scoped ordering.
- Recommended follow-up: assign `display_order` on create (`MAX + 1` per initiative) for predictable default sequence.
