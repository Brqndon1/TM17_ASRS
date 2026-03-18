# Sprint 5 - PII Exposure Endpoint Fix

## Issue Summary

- **Severity:** High
- **Endpoint:** `GET /api/surveys`
- **Risk:** The route returned raw survey submission data (`name`, `email`, `responses`) and could expose personally identifiable information (PII) if access controls were too broad.

## Root Cause

- Access control on `GET /api/surveys` allowed non-admin roles to retrieve sensitive submission payloads.
- This endpoint contains direct PII and should be treated as admin-restricted data access.

## Fix Implemented

- Updated `src/app/api/surveys/route.js`:
  - Raised authorization requirement from staff-level to admin-level:
    - `requireAccess(..., { minAccessRank: 100, requireCsrf: false })`
- This change ensures only admin users can retrieve full survey submission data from this endpoint.

## Additional Hardening

- Updated `POST /api/surveys` error handling:
  - Validation errors now return **400** (`Invalid survey payload`) instead of generic **500**.
  - Non-validation failures still return **500**.

## Test Coverage and Verification

- Updated `src/app/api/surveys/route.test.js`:
  - Added test to confirm **staff is denied** (`403`) on `GET /api/surveys`.
  - Updated authorized GET tests to use admin rank.
- Executed:
  - `npm test -- src/app/api/surveys/route.test.js`
- Result:
  - **1 test file passed**
  - **6 tests passed**

## Files Changed

- `src/app/api/surveys/route.js`
- `src/app/api/surveys/route.test.js`

## Security Impact

- Removed broad read access to PII-rich survey data.
- Reduced likelihood of accidental or unauthorized exposure of participant names/emails/responses.
- Improved reliability of API error semantics for client-side handling and monitoring.
