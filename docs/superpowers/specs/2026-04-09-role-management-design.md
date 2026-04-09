# Role-Based Permission Management — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Summary

Replace the hardcoded `access_rank` system with a dynamic, page/feature-level permission model. Admins create roles, assign permissions via checkboxes, and assign users to roles. New features become available to the permission system by adding a single database seed row.

## Permission Keys

| Key | Label | Default: admin | Default: staff | Default: public |
|---|---|---|---|---|
| `surveys.take` | Take Surveys | yes | yes | yes |
| `initiatives.manage` | Initiatives | yes | yes | no |
| `reporting.view` | Reporting | yes | yes | no |
| `reports.create` | Report Creation | yes | yes | no |
| `forms.create` | Form Creation | yes | yes | no |
| `surveys.distribute` | Survey Distribution | yes | yes | no |
| `goals.manage` | Goals & Scoring | yes | yes | no |
| `performance.view` | Performance Dashboard | yes | yes | no |
| `budgets.manage` | Budget Reporting | yes | no | no |
| `conflicts.manage` | Data Conflicts | yes | no | no |
| `users.manage` | User Management | yes | no | no |
| `audit.view` | Audit Logs | yes | no | no |
| `import.manage` | Data Import | yes | no | no |

## Database Changes

### New table: `permission`

```sql
CREATE TABLE IF NOT EXISTS permission (
  permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT
);
```

Seeded with the 13 rows above on initialization.

### New table: `role_permission`

```sql
CREATE TABLE IF NOT EXISTS role_permission (
  role_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type_id INTEGER NOT NULL REFERENCES user_type(user_type_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permission(permission_id) ON DELETE CASCADE,
  UNIQUE(user_type_id, permission_id)
);
```

### Changes to `user_type`

- `access_rank` column kept in schema for backward compatibility but no longer used for access control decisions.
- New roles created by admin get `access_rank = 50` by default (staff-level, value is vestigial).
- The `is_system` concept is tracked by convention: roles named `admin`, `staff`, `public` cannot be deleted.

### Removed

- `feature_access` table dropped (never used).
- All `minAccessRank` checks replaced with permission key checks.

### Seed helper

```js
function seedPermission(key, label, description = null) {
  db.prepare('INSERT OR IGNORE INTO permission (key, label, description) VALUES (?, ?, ?)')
    .run(key, label, description);
}
```

Adding a new feature to the permission system = one `seedPermission()` call in `db.js`.

## API Changes

### New route: `/api/admin/roles`

**GET** — List all roles with their permissions.

```json
{
  "roles": [
    {
      "user_type_id": 1,
      "type": "public",
      "is_system": true,
      "permissions": ["surveys.take"]
    }
  ],
  "allPermissions": [
    { "permission_id": 1, "key": "surveys.take", "label": "Take Surveys" }
  ]
}
```

**POST** — Create a new role.

```json
// Request
{ "name": "budget_manager", "label": "Budget Manager", "permissions": ["surveys.take", "reporting.view", "budgets.manage"] }
// Response
{ "success": true, "role": { "user_type_id": 4, "type": "budget_manager", "permissions": [...] } }
```

**PUT** — Update role permissions (and optionally name for non-system roles).

```json
// Request
{ "user_type_id": 2, "permissions": ["surveys.take", "reporting.view", "goals.manage"] }
```

**DELETE** — Delete a non-system role. Fails if users are still assigned to it.

```json
// Request query param: ?user_type_id=4
// Response
{ "success": true }
```

All endpoints require `users.manage` permission.

### Modified: `requireAccess()` → `requirePermission()`

**New signature:**
```js
export function requirePermission(request, db, permissionKey) {
  // 1. Validate session (same cookie/CSRF logic)
  // 2. Look up user's role (user_type_id)
  // 3. Check role_permission for the given permission key
  // 4. Return { user, session } or { error: 401/403 }
}
```

**Also export `requireAuth()`** for routes that just need a logged-in user (no specific permission), like `/api/auth/me` or `/api/user/profile`.

### Modified routes

Every API route replaces its `requireAccess` call:

| Route | Before | After |
|---|---|---|
| `/api/admin/users` | `minAccessRank: 100` | `requirePermission(req, db, 'users.manage')` |
| `/api/admin/audit` | `minAccessRank: 100` | `requirePermission(req, db, 'audit.view')` |
| `/api/admin/budgets` | `minAccessRank: 100` | `requirePermission(req, db, 'budgets.manage')` |
| `/api/admin/import` | `minAccessRank: 100` | `requirePermission(req, db, 'import.manage')` |
| `/api/admin/goal-conflicts` | `minAccessRank: 100` | `requirePermission(req, db, 'conflicts.manage')` |
| `/api/admin/fields` | `minAccessRank: 100` | `requirePermission(req, db, 'users.manage')` |
| `/api/goals` | `minAccessRank: 50` | `requirePermission(req, db, 'goals.manage')` |
| `/api/initiatives` | auth only (GET public) | `requirePermission` for POST/PUT/DELETE: `initiatives.manage` |
| `/api/surveys/templates` | `minAccessRank: 50` | `requirePermission(req, db, 'forms.create')` |
| `/api/qr-codes` | `minAccessRank: 50` | `requirePermission(req, db, 'surveys.distribute')` |
| `/api/audit-log` | `minAccessRank: 100` | `requirePermission(req, db, 'audit.view')` |
| `/api/user/profile` | auth only | `requireAuth()` (any logged-in user) |

### Modified: Login & `/api/auth/me` response

Add `permissions` array to the user object:

```json
{
  "user": {
    "user_id": 1,
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User",
    "user_type": "admin",
    "permissions": ["surveys.take", "initiatives.manage", "reporting.view", "..."]
  }
}
```

## Frontend Changes

### Auth store (`useAuthStore`)

Add helper:

```js
hasPermission(key) {
  return this.user?.permissions?.includes(key) ?? false;
}
```

### Home page (`/page.js`)

Replace `isAdmin`, `isStaff` checks with permission-based route visibility:

```js
const routes = [
  { href: '/survey', label: 'Take a Survey', permission: 'surveys.take', section: 'public' },
  { href: '/initiative-creation', label: 'Initiatives', permission: 'initiatives.manage', section: 'staff' },
  // ...
];

const visibleRoutes = routes.filter(r =>
  !r.permission || hasPermission(r.permission)
);
```

### Header (`Header.js`)

Same approach — nav items gated by `hasPermission()` instead of `isAdmin`/`isStaffOrAdmin`.

### User Management page (`/admin/users/page.js`)

**New "Roles" tab** alongside the existing user list:

- Tab bar at top: **Users** | **Roles**
- Roles tab shows a card for each role with:
  - Role name (editable for non-system roles)
  - Permission checkbox grid (2-3 columns)
  - Save button
  - Delete button (non-system roles only, disabled if users assigned)
- "+ Create Role" button opens a modal with name field + checkbox grid
- User table's role column becomes a dropdown of all available roles (not hardcoded)

### Individual page guards

Each protected page checks permission on mount:

```js
useEffect(() => {
  if (!hasPermission('budgets.manage')) router.push('/');
}, []);
```

## Safety Rules

1. **`admin` role cannot be deleted.**
2. **`admin` role always retains `users.manage`** — the UI disables this checkbox for admin.
3. **Users cannot remove `users.manage` from their own role** — prevents admin lockout.
4. **Cannot delete a role that has users assigned** — must reassign users first.
5. **System roles (`admin`, `staff`, `public`) cannot be renamed or deleted**, only have their permissions edited.

## Test Environment

`requirePermission()` in test mode (`NODE_ENV === 'test'`) returns a user with all permissions, matching the current `requireAccess` test behavior.
