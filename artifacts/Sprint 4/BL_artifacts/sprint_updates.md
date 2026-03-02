# Email Verification Feature — ASRS

## Overview
Users now receive an email verification link when an account is created, either through self-signup or admin creation. Accounts cannot log in until the email is verified and a password is set.

---

## Installation

```bash
npm install nodemailer
```

Add the following to `.env.local` in the project root:

```
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
APP_URL=http://localhost:3000
```

> Mailtrap is used for testing only. Emails are intercepted and viewable at mailtrap.io → Sandboxes → your inbox. Swap credentials for a real SMTP provider (Gmail, SendGrid, etc.) before production.

---

## Database Migration

Run once after pulling these changes:

```bash
node add-verification-fields.js
```

Adds three columns to the `user` table:
- `verified` — 0 (unverified) or 1 (verified), defaults to 0
- `verification_token` — random 32-byte hex token, cleared after use
- `token_expires_at` — ISO timestamp, token expires 24 hours after creation

Seed test accounts (`admin@test.com`, `staff@test.com`) are pre-verified automatically so dev login continues to work.

---

## User Flows

### Self-Signup
1. User fills out the signup form (no password field)
2. Account created in DB as `public`, `verified = false`
3. Verification email sent via Nodemailer
4. User clicks link → lands on `/verify` page → sets password
5. Account marked `verified = true`, token cleared
6. User redirected to `/login`

### Admin-Created User
1. Admin fills out Add User form in User Management (no password field)
2. Account created in DB as `staff` or `admin`, `verified = false`
3. Invite email sent to the new user
4. User clicks link → lands on `/verify` page → sets password
5. Account marked `verified = true`, token cleared
6. User can now log in

### Login Guard
Unverified users who attempt to log in receive:
> "Please verify your email before logging in. Check your inbox for the verification link."

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/email.js` | Nodemailer utility — sends signup verification and admin invite emails |
| `src/app/api/auth/verify/route.js` | GET validates token, POST sets password and marks user verified |
| `src/app/verify/page.js` | Frontend page where user lands from email link to set their password |
| `add-verification-fields.js` | One-time migration script — adds verified/token columns to user table |

---

## Files Updated

| File | What Changed |
|------|-------------|
| `src/app/api/auth/signup/route.js` | Removed password requirement; creates unverified user and sends verification email |
| `src/app/api/auth/login/route.js` | Added check to block unverified users from logging in |
| `src/app/api/admin/users/route.js` | POST no longer accepts password; sends invite email instead. GET now returns all users including public. Added `verified` field to responses |
| `src/app/admin/users/page.js` | Removed password field from Add User form; button renamed to "Send Invite"; added Verified/Pending status column to user table |
| `src/app/signup/page.js` | Removed password fields; shows "Check your email" screen after successful signup instead of redirecting to login |