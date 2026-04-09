# Admin Data Import Feature - Sprint 8

## Overview

This sprint I built a data ingestion system that lets admins import CSV or JSON files directly into the database. The idea is that admins sometimes have bulk data they need to load in (like a spreadsheet of initiatives, budget numbers, or survey submissions from another system) and right now there's no way to do that without manually entering each row through the UI. This feature adds a new admin page at `/admin/import` with a full upload, preview, and confirm workflow.

Before jumping into implementation I thought through the design pretty carefully because there are a lot of ways a generic "import into any table" feature can go wrong. The main concerns were security (you don't want admins accidentally importing into sensitive tables like `user` or `session`), data integrity (bad CSV data shouldn't silently corrupt the database), and usability (admins should be able to see what's going to happen before it happens).

---

## What Was Built

### 1. Import API Endpoint

**File:** `src/app/api/admin/import/route.js` (new)

Created a new API route with both GET and POST handlers. The GET endpoint returns the list of importable tables and their column schemas so the frontend can render dropdowns and show what columns are available. The POST endpoint handles two actions via a query parameter:

- `?action=preview` — Parses the uploaded file (CSV via papaparse or JSON), auto-maps file columns to database columns where the names match, and returns the first 10 rows as a preview along with a preview token.
- `?action=execute` — Re-parses the file, validates the preview token matches (to make sure nothing changed between preview and execute), validates every row against the table schema, and then inserts everything inside a SQLite transaction.

The key design decisions here:

- **Server-side table whitelist** instead of querying `sqlite_master`. Only 7 business-data tables are importable: `initiative`, `category`, `field`, `field_options`, `submission`, `submission_value`, and `initiative_budget`. Sensitive tables like `user`, `session`, and `audit_log` are never exposed.
- **Preview token** — When you preview, the server computes a SHA-256 hash of the table name, conflict mode, column mapping, and row count. When you execute, it recomputes the hash and checks it matches. This prevents someone from previewing one thing and then modifying the request to import something different.
- **Per-row validation** — Each row gets validated against the target table's schema. This includes type checking (numbers, booleans, enums), required field checks, and foreign key existence checks (e.g., if you're importing submissions, it verifies the `initiative_id` you reference actually exists in the `initiative` table).
- **500-row limit** — Since `better-sqlite3` is synchronous, a huge import would block the Node.js event loop. 500 rows keeps things responsive.
- **Three conflict modes** — Admins can choose how to handle rows that conflict with existing data:
  - `skip` — Silently skip conflicting rows, import the rest
  - `fail` — Reject the entire import if any row has a conflict
  - `upsert` — Update existing rows and insert new ones (uses SQLite's `ON CONFLICT DO UPDATE`)

**Impact:** Admins can now bulk-load data without going through the UI row by row or needing direct database access.

### 2. Admin Import Page

**File:** `src/app/admin/import/page.js` (new)

Built a new admin page with a 3-step workflow:

**Step 1 — Upload:** Admin selects a target table from a dropdown (populated from the API), picks a conflict mode, and uploads a CSV or JSON file. The file is read client-side using `FileReader` and the raw text content is sent to the API. When you select a table, it shows all the available columns with their types and which ones are required, so you know what your file needs to look like before uploading.

**Step 2 — Preview:** Shows the first 10 rows of the parsed file in a table. Above that is a column mapping section where each file column has a dropdown to map it to a database column (or skip it). The API auto-maps columns where the file header matches a DB column name, but admins can adjust the mapping manually if their column names don't match exactly.

**Step 3 — Result:** After executing the import, shows a summary with how many rows were inserted, updated, and skipped. If there were validation errors, they're listed in a scrollable box (capped at 50 to avoid overwhelming the page) so admins can see exactly which rows had problems and why.

The page follows the same patterns as our other admin pages — uses `useAuthStore` for auth state, redirects non-admins, uses `apiFetch` for API calls (which handles CSRF tokens automatically).

**Impact:** The whole import process is visual and has a confirmation step so admins won't accidentally import bad data.

### 3. Navigation Link

**File:** `src/components/Header.js` (modified)

Added a "Data Import" navigation link in the header that only shows up for admin users, right next to the existing "User Management" link. It highlights when you're on the `/admin/import` page, consistent with how the other nav links work.

**Impact:** Admins can easily find and access the import feature from the main navigation.

### 4. New Dependency

**File:** `package.json` (modified)

Added `papaparse` as a dependency for CSV parsing on the server side. I initially considered writing a simple inline CSV parser to avoid adding dependencies, but CSV parsing is deceptively complex. You have to handle quoted fields with commas inside them, escaped quotes, embedded newlines, byte order marks (BOMs), encoding issues, trailing empty columns, and more. Papaparse is battle-tested and handles all of these edge cases. It's a small library with no dependencies of its own.

**Impact:** CSV files are parsed correctly regardless of edge cases in the data.

---

## Security Considerations

- Admin-only access enforced at the API level via `requireAccess(request, db, { minAccessRank: 100 })` — not just the frontend redirect
- CSRF protection via the existing `apiFetch` / `requireAccess` flow
- Table and column names are validated against a hardcoded whitelist — never interpolated from user input into SQL
- Foreign key references are validated before insert (e.g., can't import a submission pointing to an initiative that doesn't exist)
- Preview token prevents tampering between the preview and execute steps
- Audit logging on both preview and execute so there's a trail of who imported what

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/admin/import/route.js` | New | Import API with preview/execute, table whitelist, validation |
| `src/app/admin/import/page.js` | New | Admin UI with 3-step import workflow |
| `src/components/Header.js` | Modified | Added "Data Import" nav link for admins |
| `package.json` | Modified | Added papaparse dependency for CSV parsing |
