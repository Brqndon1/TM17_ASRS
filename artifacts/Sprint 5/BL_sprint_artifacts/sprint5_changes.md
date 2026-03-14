# Sprint Documentation — User Profile Feature
## Overview

Implemented a full self-service profile system accessible to all authenticated user roles (public, staff, admin). Users can view their account information, edit their details, upload a profile picture, change their password, and delete their own account. The profile is accessible directly from the header navigation via a clickable avatar.

---

## Files Created

### 1. `src/app/api/user/profile/route.js`
**New API route** handling all profile operations for the currently authenticated user.

**Endpoints:**
- `GET /api/user/profile` — Returns the user's profile fields (first name, last name, email, phone, role, profile picture) plus a list of survey submissions linked to their `user_id`
- `PUT /api/user/profile` — Updates any combination of profile fields, password, and/or profile picture
- `DELETE /api/user/profile` — Permanently removes the user's account from the database

**Tools & libraries used:**
- `next/server` — `NextResponse` for all JSON responses
- `@/lib/container/service-container` — `getServiceContainer()` to access the shared `db` instance
- `@/lib/auth/server-auth` — `requireAccess()` for session validation and CSRF enforcement on mutations
- `@/lib/auth/passwords` — `hashPassword()` and `verifyPassword()` for password change handling
- `better-sqlite3` (via `db`) — prepared statements for `SELECT`, `UPDATE`, and `DELETE` on the `user` table
- Inline migration — `ALTER TABLE user ADD COLUMN profile_picture TEXT` runs on first call, safe to re-run (error caught and ignored if column already exists)

**Guards implemented:**
- All three handlers require a valid session (`minAccessRank: 10`, available to all verified users)
- PUT requires CSRF token (`requireCsrf: true`)
- DELETE requires CSRF token and includes a last-admin guard — prevents deletion if the user is the only remaining admin
- Profile picture capped at ~1 MB (1,400,000 characters base64)
- Email uniqueness checked against other accounts before update
- Password change requires current password verification before hashing and saving new password

---

### 2. `src/app/profile/page.js`
**New page** at `/profile` with a three-tab UI.

**Tabs:**
- **Profile** — Read-only display of name, email, phone, role, and a table of the user's survey submissions
- **Edit Profile** — Editable form for all profile fields, optional profile photo upload, and optional password change section
- **Delete Account** — Requires typing `DELETE` verbatim to enable the confirmation button; shows a warning about irreversibility

**Tools & libraries used:**
- `react` — `useState`, `useEffect`, `useRef` for all local state, side effects, and the hidden file input ref
- `next/navigation` — `useRouter` for post-delete redirect to `/login`
- `@/components/Header` — shared header rendered at the top of the page
- `@/lib/auth/use-auth-store` — `user`, `setUser`, `clearUser` from the auth store; `setUser` is called after a successful save to update the header name in real time
- `@/lib/api/client` — `apiFetch` for all three API calls (`GET`, `PUT`, `DELETE`), with `.then(res => res.json())` added since `apiFetch` returns a raw `fetch` Response
- `FileReader` API — converts the selected image file to a base64 data URL before sending to the API
- No external UI libraries — all styling is inline

**Key implementation notes:**
- `pictureDataUrl` state uses `null` to mean "no change" and an empty string `''` to mean "remove photo", allowing the PUT body to omit the field entirely when the user hasn't touched it
- After a successful PUT, `setUser` is called with updated `first_name` and `last_name` so the header avatar/name updates immediately without a page reload

---

## Files Modified

### 3. `src/components/Header.js`

**Changes made:**

1. **Added `ProfileAvatar` component** (above the `Header` function) — renders a 36×36 circular profile picture if one exists, or a gradient initials badge as fallback. Accepts `user` and `picture` props.

2. **Added `profilePic` state** — `useState(null)` inside the `Header` function to hold the fetched profile picture URL.

3. **Added `useEffect` to fetch profile picture** — calls `GET /api/user/profile` in the background whenever `user` changes. Non-blocking; silently falls back to `null` on error so the header never breaks.

4. **Replaced name/role text with a clickable avatar** — the plain `<div>` showing the user's name and role was replaced with a `<Link href="/profile">` wrapping the `ProfileAvatar` component alongside the name/role text, making the entire section a clickable link to `/profile`.

5. **Moved Logout button out of `<nav>` and into the avatar section** — the button now renders below the avatar/name link in a `flexDirection: 'column'` container, keeping all nav tabs on one line and grouping logout visually with the user identity.

**Tools & libraries used:**
- `next/link` — `Link` component for the `/profile` navigation (already imported)
- `@/lib/api/client` — `apiFetch` for the background profile picture fetch (already imported)
- `react` — `useState` for `profilePic` (already imported)

---

## Database Changes

| Change | Method |
|---|---|
| Added `profile_picture TEXT` column to `user` table | Auto-migration in `GET /api/user/profile` on first request |

No manual SQL or changes to `db.js` are required. The migration follows the same pattern as existing migrations in `db.js` — wraps the `ALTER TABLE` in a try/catch and silently ignores the error if the column already exists.

---

## Notes

- Profile picture is stored as a base64 data URL directly in the `user` table (no file system or object storage needed). This keeps the implementation self-contained but is best suited for small images — the 1 MB limit enforced on both client and server keeps row sizes manageable.
- Because all user data lives in a single `user` table, any edits made via the profile page are immediately reflected in the admin User Management view at `/admin/users` with no additional sync logic required.
- The `submitted_by_user_id` column on the `submission` table was already present in the schema. Existing submissions with a `NULL` value for that column simply won't appear in the user's submissions list, which is expected behaviour for data entered before user tracking was in place.