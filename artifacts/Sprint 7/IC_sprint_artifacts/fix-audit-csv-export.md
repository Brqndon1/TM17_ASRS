# Fix: Audit Log CSV Export Only Exported Current Page

## What I Changed

**File:** `src/app/api/admin/audit/route.js`

The CSV export feature on the audit logs page had a bug where clicking "Export CSV" would only give you the rows from whatever page you were currently viewing instead of all the matching results. So if you had 500 audit entries and were looking at page 1 with a limit of 50, your CSV file would only have 50 rows in it and you'd have no idea the rest were missing.

This happened because the export was reusing the same paginated database query that the normal table view uses, which includes `LIMIT` and `OFFSET` clauses. The CSV path never had its own query.

## What I Did

I moved the CSV export logic above the paginated query and gave it a separate database query that pulls all matching rows without any `LIMIT` or `OFFSET`. The filters (search text, event type, target type, date range) still apply so admins get exactly the data they filtered for, just all of it instead of one page worth.

The normal paginated JSON response still works the same as before since the paginated query now only runs when it's not a CSV export request (the CSV path does an early return).

## Impact

- Admins exporting audit logs now get the complete filtered dataset in their CSV file
- No changes to the frontend, the export button works the same way it did before
- The regular audit log table view with pagination is completely unaffected
