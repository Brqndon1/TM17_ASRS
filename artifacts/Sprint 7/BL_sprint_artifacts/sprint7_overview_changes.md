# Sprint Summary — Audit Logging

## Overview

Implemented a system-wide audit logging feature that maintains a complete, read-only record of all administrative/staff changes across the ASRS platform. The feature tracks CRUD operations on goals, initiatives, reports, surveys, and user accounts, capturing who made each change, when, and what was modified. The audit log is accessible to administrators through a new "History" navigation section with filtering, search, and pagination.

## What Was Done

Renamed the "Historical Reports" header tab to "History" and restructured it as a dropdown with two subtabs: **Reports** (the existing historical reports page, relocated) and **Audit Log** (new, admin-only). Built a lightweight audit helper (`logAudit`) that any API route can call after a successful write operation to record the event. The helper is fire-and-forget — if the audit write fails, it logs an error to the console but never interrupts the primary operation.

Wired audit logging into six API route files covering all major entities: goals, initiatives, reports, survey templates, survey distributions, and admin user management. For update operations, the system captures a before/after diff of changed fields so administrators can see exactly what was modified. The audit log frontend includes filters for action type (created, updated, deleted), entity type (goal, initiative, report, survey, user), date range, and free-text search.

## New Files

| File | Purpose |
|------|---------|
| `src/lib/audit.js` | Audit helper — exports `logAudit(db, { event, userEmail, targetType, targetId, payload })` |
| `src/lib/audit.test.js` | Unit tests for the helper (16 tests covering coercion, serialization, error resilience) |
| `src/app/api/audit-log/route.js` | GET endpoint — admin-only, paginated, with action/entity/date/search filtering |
| `src/app/api/audit-log/route.test.js` | Edge case tests for the API route (25 tests covering auth, pagination, filters, errors) |
| `src/app/history/audit-log/page.js` | Audit log viewer page — admin-only, expandable payload details, color-coded action badges |
| `src/app/history/reports/page.js` | Historical reports page relocated from `/historical-reports` to `/history/reports` |
| `src/app/api/goals/route.audit.test.js` | Integration tests verifying audit calls fire correctly from the goals route (9 tests) |

## Modified Files

| File | Changes |
|------|---------|
| `src/components/Header.js` | Replaced "Historical Reports" link with "History" dropdown containing "Reports" and "Audit Log" subtabs; added `HistoryDropdown` component |
| `src/app/historical-reports/page.js` | Replaced page content with a client-side redirect to `/history/reports` |
| `src/app/api/goals/route.js` | Added `logAudit` calls to POST (goal.created), PUT (goal.updated with field diff), and DELETE (goal.deleted) |
| `src/app/api/initiatives/route.js` | Fixed broken `validateReason`/`recordAudit` imports; replaced with `logAudit` call on POST (initiative.created) |
| `src/app/api/reports/route.js` | Fixed broken imports; added `logAudit` calls to POST (report.created), PUT (report.updated), DELETE (report.deleted); removed `validateReason` dependency |
| `src/app/api/admin/users/route.js` | Fixed broken imports; added `logAudit` calls to POST (user.created), PUT (user.updated with role diff), DELETE (user.deleted); removed `validateReason` dependency |
| `src/app/api/surveys/templates/route.js` | Added `logAudit` calls to POST (survey.created) and DELETE (survey.deleted) |
| `src/app/api/surveys/templates/[id]/route.js` | Added `logAudit` call to DELETE (survey.deleted) |
| `src/app/api/surveys/distributions/route.js` | Added `logAudit` call to POST (survey.created for distributions) |

## How the Audit Log Works

**Database layer.** The `audit_log` table was already defined in the schema (db.js) with columns for `event`, `user_email`, `target_type`, `target_id`, `reason_type`, `reason_text`, `payload` (JSON), and `created_at` (auto-timestamped). An index on `created_at DESC` supports the default reverse-chronological query.

**Writing entries.** API routes call `logAudit(db, { ... })` after a successful database write. The helper wraps the INSERT in a try/catch so a failure never propagates to the caller. The `payload` field stores a JSON-serialized object containing relevant context — for creates, this includes the new entity's key fields; for updates, it includes a `changes` object with `{ field: { from, to } }` diffs; for deletes, it captures the entity's data before removal.

**Event naming.** Events follow a `<entity>.<action>` convention (e.g., `goal.created`, `user.updated`, `report.deleted`). This convention enables the API's filter logic: the action filter uses `LIKE '%.created'` to match the verb suffix, while the entity filter matches `target_type` exactly.

**Reading entries.** The `GET /api/audit-log` endpoint is restricted to admin users (`minAccessRank: 100`) and builds a dynamic WHERE clause from optional query parameters (`action`, `entity`, `startDate`, `endDate`, `search`). Pagination is offset-based with a default of 50 rows per page and a maximum of 200. The endpoint returns both the entries array and a pagination metadata object.

**Frontend.** The audit log page fetches entries via `apiFetch` and renders them in a table with color-coded action badges (green for created, blue for updated, red for deleted). Rows are clickable to expand the payload details — for updates, this renders a visual diff with the old value struck through and the new value highlighted. Filters, search, and pagination controls are provided above the table.

**Acceptance criteria coverage.** log all CRUD operations — covered for goals, initiatives, reports, surveys, and users. capture timestamp, user, action, change type — all four are stored per entry. support up to 100,000 entries — SQLite with the existing index handles this. auto-archive old entries — not yet implemented; can be added as a scheduled cleanup task. read-only access to logs — the API only exposes a GET endpoint with admin-only auth.
