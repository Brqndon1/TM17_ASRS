# Admin User Management

## Overview

The admin user management feature supports **Manage User Profiles & Roles**. It allows admin users to view all staff and admin accounts, add new privileged users, change user roles between staff and admin, and delete user accounts with confirmation.

This feature consists of three components: an API route (`src/app/api/admin/users/route.js`), a frontend page (`src/app/admin/users/page.js`), and an updated header component (`src/components/Header.js`) that conditionally displays the "User Management" navigation tab for admin users.

---

## API Route: `/api/admin/users`

Located at `src/app/api/admin/users/route.js`, this route handles all CRUD operations for user management. Every endpoint verifies the requester holds an `admin` role before proceeding.

### Endpoints

| Method | Purpose | Auth Check | Key Validations |
|--------|---------|------------|-----------------|
| `GET` | List all staff/admin users | Admin email via query param | Returns users sorted by access rank, then last name |
| `POST` | Create a new staff/admin user | Admin email in request body | Email uniqueness, valid format, role must be `staff` or `admin`, all fields required |
| `PUT` | Update a user's role | Admin email in request body | Cannot demote own account, role must be `staff` or `admin` |
| `DELETE` | Remove a user account | Admin email via query param | Cannot delete own account, user must exist |

--

## Frontend Page: `/admin/users`

Located at `src/app/admin/users/page.js`, this is a client-side rendered page accessible only to admin users.

### Features

| Feature | Description |
|---------|-------------|
| **User Table** | Displays all staff/admin users with name, email, phone, and role badge |
| **Search** | Client-side filtering by name or email |
| **Role Filter** | Dropdown to show all roles, admin only, or staff only |
| **Role Toggle** | One-click button to switch a user between staff and admin (disabled for self) |
| **Delete User** | Opens a confirmation modal showing user details before deletion (disabled for self) |
| **Add User** | Modal form to create a new staff/admin account with first name, last name, email, password, and role selection |

### Access Control (Client-Side)

- On mount, checks `localStorage` for the logged-in user
- If no user is found, redirects to `/login`
- If the user's `user_type` is not `admin`, redirects to `/`
- All API calls pass the admin's email for server-side verification

### UI Components

| Component | Type | Behavior |
|-----------|------|----------|
| Role badge | Inline label | Blue (`#e8eaf6`) for admin, green (`#e8f5e9`) for staff |
| Role toggle button | Table action | Shows "→ Staff" or "→ Admin" depending on current role |
| Delete button | Table action | Red-styled, opens confirmation modal |
| Delete modal | Overlay dialog | Shows target user info, requires explicit confirmation, dismissible via Cancel or clicking outside |
| Add User modal | Overlay dialog | Form with validation — password min 6 chars, email format check, duplicate email check via API |
| Success message | Banner | Green banner, auto-dismisses after 4 seconds |
| "(you)" label | Inline text | Shown next to the logged-in admin's own row |

---

## Header Update: `src/components/Header.js`

The header component was modified to conditionally render the "User Management" navigation tab.

### Changes Made

| Change | Description |
|--------|-------------|
| Added `isAdmin` variable | `const isAdmin = isLoggedIn && user.user_type === 'admin'` |
| Added conditional nav link | `{isAdmin && <Link href="/admin/users">User Management</Link>}` rendered after the "Reporting" tab |

### Navigation Visibility by Role

| Tab | Public (logged out) | Public (logged in) | Staff | Admin |
|-----|--------------------|--------------------|-------|-------|
| Home | ✅ | ✅ | ✅ | ✅ |
| Form Creation | ❌ | ✅ | ✅ | ✅ |
| Survey | ✅ | ✅ | ✅ | ✅ |
| Report Creation | ❌ | ✅ | ✅ | ✅ |
| Reporting | ❌ | ✅ | ✅ | ✅ |
| User Management | ❌ | ❌ | ❌ | ✅ |

---

## Safety Guards

| Guard | Location | Description |
|-------|----------|-------------|
| Server-side admin check | `route.js` — `verifyAdmin()` | Every endpoint queries the DB to confirm the requester is an admin |
| Self-demotion block | `route.js` — PUT handler | Returns 400 if admin tries to change their own role to staff |
| Self-deletion block | `route.js` — DELETE handler | Returns 400 if admin tries to delete their own account |
| Client-side disable | `page.js` — action buttons | Role toggle and delete buttons are visually disabled and non-clickable on the admin's own row |
| Client-side redirect | `page.js` — `useEffect` | Non-admin users are redirected away from the page on mount |
| Duplicate email check | `route.js` — POST handler | Returns 409 if email already exists in the database |

---

## Database Tables Used

This feature reads from and writes to existing tables defined in `src/lib/db.js`:

- **`user`** — stores user accounts (queried, inserted, updated, deleted)
- **`user_type`** — stores role definitions and access ranks (queried for role lookups)

No new tables or schema changes were required.

---

## Files Added/Modified

| File | Action | Location |
|------|--------|----------|
| `route.js` | **Added** | `src/app/api/admin/users/route.js` |
| `page.js` | **Added** | `src/app/admin/users/page.js` |
| `Header.js` | **Modified** | `src/components/Header.js` |
| `promote-test-admin.js` | **Added** | Project root (migration script, run once) |
| `db.js` | **Modified** | `src/lib/db.js` (added seed data for test admin/staff users) |

---

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `test@gmail.com` | `testing` | admin |
| `staff@gmail.com` | `testing` | staff |
