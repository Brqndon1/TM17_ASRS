# High Fix Summary: Missing Server-Side Authorization on Data-Modifying APIs

## What the problem was
Several endpoints that modify core business data originally did not consistently enforce server-side authorization before writes.

That created a high-risk condition: anonymous or low-privileged callers could potentially attempt create/update/delete operations on important records.

The affected business areas included things like:
- goals
- categories
- initiatives
- reports (including reorder/update/delete operations)
- survey templates
- survey distributions

## Why this was high severity
These APIs are directly tied to application integrity. If unauthorized users can mutate this data, they can:
- corrupt reporting results
- delete or alter tracking goals
- change initiative structure
- manipulate ordering/visibility of reports
- publish or distribute surveys incorrectly

Even without account takeover, this can cause operational damage and loss of trust in system data.

## What changed in the fix
The core fix was adding and standardizing `requireAccess(...)` checks at the start of mutation handlers.

The same broad hardening commit (`03c0ac5`, March 5, 2026) introduced/standardized authorization checks across these routes, generally with staff-or-admin minimum rank (`minAccessRank: 50`) for business mutations.

### Examples of protected mutation routes now
- `/api/goals` `POST|PUT|DELETE`
- `/api/categories` `POST`
- `/api/categories/[id]` `PUT|DELETE`
- `/api/initiatives` `POST`
- `/api/reports` `POST|PUT|DELETE`
- `/api/reports/reorder` `PUT`
- `/api/surveys/templates` `POST`
- `/api/surveys/distributions` `POST`

Typical pattern now used:
1. Initialize DB/service context.
2. Call `requireAccess(request, db, { minAccessRank: 50 })`.
3. Immediately return `auth.error` if auth fails.
4. Only then continue with validation and write logic.

## Why this fix works
Authorization is now enforced server-side before mutation logic runs.

So a caller must present a valid authenticated session with sufficient access rank. If the session is missing/invalid/insufficient, the write is denied. This closes the original anonymous write path.

## Additional quality improvements around the fix
- Expanded API tests were added around auth and route behavior.
- Authorization handling is now more centralized and consistent across route files.
- This reduces the chance of one endpoint accidentally being left unprotected.

## Important nuance
Some mutation endpoints are still intentionally public by design (for example login/signup/verification flows), and there is also a debug alert endpoint used for diagnostics.

But for the core business mutation APIs listed in the security finding, server-side authorization is now present.

## Bottom line
The high-severity issue was addressed by adding consistent server-side authorization gates (`requireAccess`) to critical data-modifying endpoints. Anonymous mutation of core business data is no longer the expected behavior for those protected routes.
