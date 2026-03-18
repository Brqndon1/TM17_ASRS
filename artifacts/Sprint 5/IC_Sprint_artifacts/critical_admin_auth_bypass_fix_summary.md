# Critical Fix Summary: Admin Auth Bypass via Spoofed Email

## What the problem was
The original `POST`, `PUT`, and `DELETE` logic in `/api/admin/users` used an **email value sent by the client** (for example `requesterEmail` in request body/query) to decide whether the caller was an admin.

That means authorization was based on user-controlled input. If an attacker knew an admin's email, they could send that email in the request and pass the admin check.

In security terms, this is a broken authorization pattern because the server trusted data that can be forged by the caller.

## Why this was critical
This endpoint can:
- create privileged users
- change user roles
- delete user accounts

So the impact was full compromise of administrative user management. A non-admin could potentially promote accounts or remove users if they spoofed admin identity.

## What changed in the fix
The key fix was moving from client-claimed identity to **server-authenticated identity**.

In commit `03c0ac5` (March 5, 2026), `/api/admin/users/route.js` was updated to:

1. Remove `verifyAdmin(db, requesterEmail)` style checks.
2. Remove dependence on `requesterEmail` from request body/query for authorization decisions.
3. Add server-side authorization guard at route entry:
   - `requireAccess(request, db, { minAccessRank: 100 })` for mutation endpoints
   - `requireAccess(request, db, { minAccessRank: 100, requireCsrf: false })` for safe reads
4. Use authenticated identity from session (`auth.user.email`) for actions like audit/event metadata (`invitedBy`, self-demotion/self-delete checks), instead of using caller-supplied email.

So now the server decides who the requester is from session/cookie state it controls, not from JSON/query values the attacker controls.

## Why this fix works
`requireAccess(...)` validates the caller's active session and access rank on the server. If no valid session exists, the request is rejected. If the user is not admin rank (`minAccessRank: 100`), the request is rejected.

This blocks the spoofing path entirely because sending `requesterEmail=admin@...` no longer matters; that field is no longer the source of truth for identity.

## Security design improvement
This change also improves consistency:
- All admin-user mutations now follow one centralized auth model.
- Authorization logic is not duplicated per endpoint with custom rules based on request parameters.
- The same authenticated user object is reused for auditing and business rules.

That reduces risk of future drift where one method accidentally uses weaker checks.

## Evidence in code (current)
`src/app/api/admin/users/route.js` now performs `requireAccess(..., minAccessRank: 100)` at the top of GET/POST/PUT/DELETE handlers and relies on `auth.user` as identity.

## Bottom line
This critical vulnerability is fixed by replacing spoofable email-based admin checks with server-verified session authorization. The exploit path "pretend to be admin by submitting admin email" is no longer valid.
