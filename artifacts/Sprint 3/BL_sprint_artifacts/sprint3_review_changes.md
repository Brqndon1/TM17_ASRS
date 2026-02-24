# ASRS Weekly Development Summary
**Sprint Week:** February 17 – February 24, 2026
**Project:** ASRS Initiatives Reporting System
**Author:** Brandon Lyubarsky
---
## Overview

This week's work focused on strengthening the security and usability of the user authentication and account management flows. Key areas of improvement included enforcing stronger password standards, making phone number a required field during signup and adding a user, refining the User Management admin interface, and introducing a visual "Public" label to clearly distinguish public users in the system.

---

## 1. Password Security Enhancements

**What was done:**
Upgraded the password handling system to enforce stronger security standards across both the signup and admin-facing user creation flows.

**Changes include:**
- Added password strength validation requiring a minimum length and character complexity (e.g., 6-char minimum, number, special character)
- Integrated `bcrypt` hashing so passwords are no longer stored in plaintext in the database — all passwords are hashed before being written to `asrs.db`
- Updated the login route (`/api/auth/login`) to compare submitted passwords against stored bcrypt hashes using `bcryptjs.compare()`
- Updated the signup route (`/api/auth/signup`) and admin Add User modal to hash passwords on creation

**Files affected:**
- `src/app/api/auth/login/route.js`
- `src/app/api/auth/signup/route.js`
- `src/app/api/admin/users/route.js`
- `src/app/signup/page.js` (client-side validation feedback)
- `src/app/login/page.js`

---

## 2. Phone Number Required on Signup

**What was done:**
The `phone_number` field in the `user` table was already present in the schema but was optional. This week it was made a required field during the public user signup flow.

**Changes include:**
- Added `phone_number` as a required input on the signup page (`/signup`) with a formatted input field
- Updated the signup API route to validate that `phone_number` is present and non-empty before inserting a new user
- Returns a `400` error with a clear message if phone number is missing
- Phone number is now stored consistently for all new public users going forward

**Files affected:**
- `src/app/signup/page.js`
- `src/app/api/auth/signup/route.js`

---

## 3. User Management Interface Updates

**What was done:**
Continued improving the admin-facing User Management page (`/admin/users`) with UX and functional improvements.

**Changes include:**
- Phone number column is now displayed in the user table for all listed accounts
- Add User modal updated to include phone number as a required field when creating new staff/admin accounts
- Form validation in the modal now covers phone number presence alongside existing checks (email uniqueness, password length, role selection)
- Minor styling refinements to role badges and table layout for readability

**Files affected:**
- `src/app/admin/users/page.js`
- `src/app/api/admin/users/route.js`

---

## 4. Public User Label

**What was done:**
Added a visual "Public" label/badge to clearly identify public-type users in the system, consistent with the existing admin and staff role badges.

**Changes include:**
- Role badge system extended to include a distinct "Public" badge (e.g., gray/neutral styling to differentiate from blue admin and green staff badges)
- Public badge now renders in the User Management table where applicable
- Ensures admins have a clear at-a-glance view of all three user types: `admin`, `staff`, and `public`

**Files affected:**
- `src/app/admin/users/page.js`

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/app/api/auth/login/route.js` | Updated to use bcrypt password comparison |
| `src/app/api/auth/signup/route.js` | Added phone number validation + bcrypt hashing |
| `src/app/api/admin/users/route.js` | Updated Add User endpoint to hash passwords and accept phone number |
| `src/app/signup/page.js` | Added phone number field + client-side password strength feedback |
| `src/app/admin/users/page.js` | Added phone column, public badge, updated Add User modal |

---
