# Admin Users Filter Fix Summary

## What was done
We implemented the second improvement in the codebase: fixing the `/api/admin/users` GET endpoint so it matches its intended behavior.

Before this change, the query returned users with roles:
- `public`
- `staff`
- `admin`

But the endpoint description says it should list only **staff/admin users**.

## Why this matters
Returning `public` users from an admin staff-management list is confusing and can expose extra personal data that is not needed for this screen.

This fix makes the API behavior match its contract and reduces unnecessary data exposure.

## Main code change
Updated file:
- `src/app/api/admin/users/route.js`

Query change:
- From: `WHERE ut.type IN ('public', 'staff', 'admin')`
- To: `WHERE ut.type IN ('staff', 'admin')`

## Test added
New test file:
- `src/app/api/admin/users/route.test.js`

The test verifies:
- Admin requester is still authorized.
- The query used by GET includes only `staff` and `admin`.
- The query does not include `public`.

## Validation result
We ran the full test suite with `npm test`.

Result:
- 6 test files passed
- 14 tests passed

## Outcome
The admin users endpoint now behaves as documented and returns only the relevant account types for admin management tasks.
