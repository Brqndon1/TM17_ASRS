# ASRS Audit Viewer Implementation Report

Date: 2026-03-28

Author: GitHub Copilot (assistant)

Overview
--------
This document describes, in exhaustive detail, all work completed in this chat session to add an Admin Audit Viewer to the ASRS project. It includes every coding change made, the files added or modified, why each change was made, how the feature works, authentication considerations, testing instructions, and recommended next steps.

High-level summary
------------------
- Implemented an admin-facing Audit Viewer (UI + server API) to allow administrators to view, search, filter, inspect JSON payloads, paginate, and export audit entries to CSV.
- Integrated the viewer into app navigation (header link) and home page Administration cards.
- Reused existing audit persistence (`audit_log` table and `recordAudit()` helper).
- Explored authentication logic (`requireAccess`) and provided diagnostics for 401/403 behavior.
- Tracked progress using the internal todo list.

Files Added
-----------
- `src/app/api/admin/audit/route.js`
  - Implements `GET /api/admin/audit` with filtering, pagination and CSV export support.
  - Query params: `q`, `user_email`, `event`, `target_type`, `date_from`, `date_to`, `limit`, `offset`, `export=csv`.
  - Returns JSON `{ success, total, rows }` or CSV when `export=csv` is specified.

- `src/app/admin/audit/page.js`
  - Admin UI page available at `/admin/audit`.
  - Features: search (general), date range filter, event and target-type filters, pagination, export CSV button, and modal for pretty-printed JSON payload viewing.
  - Access checked client-side via `useAuthStore()`; non-admins redirected.

Files Modified
--------------
- `src/components/Header.js`
  - Added an "Audit Logs" navigation link visible only to admin users, pointing to `/admin/audit`.

- `src/app/page.js`
  - Added `IconAudit` icon mapping and a route entry for `/admin/audit` under the `admin` section so that a card appears on the home page.

Inspected (no changes)
----------------------
- `src/lib/db.js`
  - `audit_log` table already exists with these fields:
    - `audit_id`, `event`, `user_email`, `target_type`, `target_id`, `reason_type`, `reason_text`, `payload`, `created_at`.

- `src/lib/audit.js`
  - `recordAudit()` helper validates reason and inserts rows into `audit_log`.
  - Many admin flows already call `recordAudit(...)` (e.g., user CRUD), so reads display existing data.

Server API Details
------------------
- Endpoint: `GET /api/admin/audit`
- Query parameters and behavior:
  - `q` — wildcard LIKE search across `user_email`, `event`, and `payload` using `%q%`.
  - `user_email`, `event`, `target_type` — exact-match filters.
  - `date_from`, `date_to` — inclusive date filters on `created_at`.
  - `limit` (default 100, capped 1000) and `offset` — pagination.
  - `export=csv` — returns CSV with headers: `audit_id, created_at, event, user_email, target_type, target_id, reason_type, reason_text, payload`.
- Security: Requires admin-level access (`requireAccess` with `minAccessRank: 100`); unauthenticated or insufficiently privileged requests receive 401/403 as appropriate.
- CSV implementation: server-side row fetching, cell escaping for commas/newlines/quotes, returns `Content-Disposition: attachment` with a filename.

Front-end UI Details
--------------------
- Admin page (`/admin/audit`):
  - Uses `apiFetch('/api/admin/audit?...')` to fetch results.
  - UI controls: search box, `date_from`, `date_to`, `event` (exact), `target_type` (exact), limit/offset pagination.
  - Buttons: "Search" refreshes results, "Export CSV" opens the API endpoint with `export=csv` to download filtered results.
  - Results table: shows time, event, user, target, reason, and a "View" button.
  - Payload modal: parses and pretty-prints `payload` JSON where available.
- Navigation integrations:
  - Header: new admin-only link "Audit Logs" added to `src/components/Header.js`.
  - Home page: new card in Administration section linking to `/admin/audit`.

Authentication & Authorization
------------------------------
- The server-side `requireAccess` helper (in `src/lib/auth/server-auth.js`) checks:
  - The `asrs_session` cookie token, looks up the session record, checks for revocation, idle expiration, absolute expiration.
  - The `verified` flag must be true for the user.
  - `access_rank` must be >= requested `minAccessRank` (100 for admin).
  - For state-changing methods it asserts CSRF tokens match.
- Response semantics:
  - 401 Unauthorized for missing/expired session or unverified user.
  - 403 Forbidden for insufficient permissions or CSRF failures.

Reproducible Steps to Test
--------------------------
1. Start app locally:

```bash
npm install
npm run dev
```

2. Sign in as an admin (or create an admin/verify an account). The app's login flow is used.
3. Open the header or home page Administration card and navigate to "Audit Logs" (`/admin/audit`).
4. Use search, date filters, event/target filters; click "View" on rows to inspect payloads.
5. Export CSV using the Export button (downloads filtered results).
6. To create audit entries:
   - Use existing admin flows that call `recordAudit()`, e.g., User Management create/update/delete actions (they prompt for a reason and call `recordAudit`).

API Examples
------------
- JSON listing:
  - `GET /api/admin/audit?q=alice@example.com&limit=50`
- CSV export:
  - `GET /api/admin/audit?event=user.updated&export=csv`

Debugging a 401 on User Management
----------------------------------
- Check browser cookies -> `asrs_session` and `asrs_csrf` are present for `localhost:3000`.
- Inspect the failing API call in DevTools – check the status (401 vs 403) and response JSON.
- Inspect DB session rows:

```sql
SELECT s.session_id, s.user_id, s.expires_at, s.revoked_at, u.email, u.verified, ut.type, ut.access_rank
FROM session s
JOIN user u ON s.user_id = u.user_id
JOIN user_type ut ON u.user_type_id = ut.user_type_id
ORDER BY s.created_at DESC
LIMIT 20;
```

- Verify session exists for your cookie token, is not revoked, not expired, and that the user is `verified=1` and `user_type='admin'` (or `access_rank >= 100`).

Security Notes
--------------
- The API honors existing auth patterns. CSV exports are admin-only. For very large datasets consider asynchronous export and background jobs.
- Payloads are JSON strings — the UI parses them for display. Malformed payloads show raw text.

Files changed / added
----------------------
- Added: `src/app/api/admin/audit/route.js`
- Added: `src/app/admin/audit/page.js`
- Modified: `src/components/Header.js`
- Modified: `src/app/page.js`

Next recommended improvements
---------------------------
- Add server-side tests for `GET /api/admin/audit`.
- Add client-side unit tests for `/admin/audit` page.
- Add DB indexes on `user_email`, `event`, and `target_type` for performance if needed.
- Consider streaming or background export for very large CSVs.

Appendix — change snippets
--------------------------
(Full files are in the repository under the paths listed above.)

---

End of report.
