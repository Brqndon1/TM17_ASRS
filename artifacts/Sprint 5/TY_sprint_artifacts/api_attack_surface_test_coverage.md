# Sprint 5 - API Attack Surface Test Coverage

## Summary
This Sprint 5 update improves API attack-surface coverage by adding tests for previously untested API routes. The goal was to reduce risk on sensitive endpoints and increase confidence in auth, profile, and debug-path handling.

## Work Completed
- Added new API route tests for:
  - `src/app/api/user/profile/route.test.js`
  - `src/app/api/qr-codes/route.test.js`
  - `src/app/api/debug/alert/route.test.js`
- Covered key security and reliability behaviors:
  - Unauthorized access handling
  - Input validation failures
  - Successful response paths
  - Guard logic (e.g., only-admin self-delete protection)

## Test Scope Details
- **User Profile API**
  - Unauthorized access rejection
  - Successful profile/submission retrieval
  - Invalid email validation on update
  - Prevent deletion of the only admin account
- **QR Codes API**
  - Unauthorized request rejection
  - Successful list retrieval and response transformation/stat fields
- **Debug Alert API**
  - Valid payload path
  - Invalid JSON payload fallback path

## Validation Evidence
- Executed:
  - `npm test -- src/app/api/user/profile/route.test.js src/app/api/qr-codes/route.test.js src/app/api/debug/alert/route.test.js`
- Result:
  - **3 test files passed**
  - **8 tests passed**
- Lint diagnostics for new test files: **no issues**

## Impact
- Reduced the gap between number of API route files and API route test files.
- Added direct coverage to endpoints that include auth/authorization checks and utility/debug paths.
- Improved confidence that core API protections and error handling remain stable during future changes.
