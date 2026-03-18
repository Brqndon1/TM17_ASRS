# Quick Fix: Password Input Validation (Auth)

## What I changed
I updated the auth API so it rejects passwords that are empty or just spaces.

Files updated:
- `src/app/api/auth/login/route.js`
- `src/app/api/auth/verify/route.js`
- `src/app/api/auth/login/route.test.js`
- `src/app/api/auth/verify/route.test.js`

## Why this matters
Before this fix, a password like `"   "` could pass the basic "exists" check in some cases since spaces are still characters. That is not a real password and could cause weird auth behavior.

Now the API trims the password for validation and returns `400` if it is blank.

## Behavior after fix
- Login route requires:
  - valid email (not blank)
  - password with at least one non-space character
- Verify route requires:
  - valid token
  - password with at least one non-space character
  - minimum length rule still enforced

## Test coverage added
Added tests to confirm whitespace-only passwords are rejected:
- `/api/auth/login` returns `400` for `"   "`
- `/api/auth/verify` returns `400` for `"        "`

## Validation run
Command used:
`npm test -- src/app/api/auth/login/route.test.js src/app/api/auth/verify/route.test.js`

Result:
- 2 test files passed
- 7 tests passed

## Notes
This is a small hardening change, but it closes an easy input-validation gap and makes auth handling more consistent.
