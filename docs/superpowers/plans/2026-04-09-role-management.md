# Role-Based Permission Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `access_rank` authorization system with dynamic, page/feature-level permissions that admins manage through a checkbox UI.

**Architecture:** New `permission` and `role_permission` tables in SQLite. `requireAccess()` replaced by `requirePermission(key)` which checks the user's role permissions. Login/me endpoints return a `permissions` array. Frontend gates all nav items and pages via `hasPermission(key)`.

**Tech Stack:** Next.js 16 App Router, better-sqlite3, React 19, Tailwind CSS 4, Vitest

---

## File Map

### New Files
- `src/app/api/admin/roles/route.js` — CRUD API for roles and their permissions
- `src/app/api/admin/roles/route.test.js` — Tests for roles API

### Modified Files
- `src/lib/db.js` — Add `permission` and `role_permission` tables, seed permissions and default role mappings
- `src/lib/auth/server-auth.js` — Add `requirePermission()`, `requireAuth()`, `getUserPermissions()`. Keep `requireAccess()` temporarily for migration.
- `src/lib/auth/server-auth.js` (second pass) — Remove `requireAccess()` after all routes migrated
- `src/lib/auth/auth-store.js` — Add `hasPermission(key)` method
- `src/lib/auth/use-auth-store.js` — Expose `hasPermission` from hook
- `src/app/api/auth/login/route.js` — Include `permissions` array in login response
- `src/app/api/auth/me/route.js` — Include `permissions` array in me response
- `src/app/api/admin/users/route.js` — Use `requirePermission('users.manage')`, dynamic role list
- `src/app/api/admin/audit/route.js` — Use `requirePermission('audit.view')`
- `src/app/api/admin/budgets/route.js` — Use `requirePermission('budgets.manage')`
- `src/app/api/admin/fields/route.js` — Use `requirePermission('users.manage')`
- `src/app/api/admin/import/route.js` — Use `requirePermission('import.manage')`
- `src/app/api/admin/goal-conflicts/route.js` — Use `requirePermission('conflicts.manage')`
- `src/app/api/goals/route.js` — Use `requirePermission('goals.manage')`
- `src/app/api/goals/initiatives/route.js` — Use `requirePermission('goals.manage')`
- `src/app/api/goals/history/route.js` — Use `requirePermission('goals.manage')`
- `src/app/api/initiatives/route.js` — Use `requirePermission('initiatives.manage')` for mutations
- `src/app/api/initiatives/[id]/report-data/route.js` — Use `requirePermission('reporting.view')`
- `src/app/api/initiative-categories/route.js` — Use `requirePermission('initiatives.manage')`
- `src/app/api/surveys/route.js` — Use `requireAuth()` for public submissions, `requirePermission` for admin ops
- `src/app/api/surveys/templates/route.js` — Use `requirePermission('forms.create')`
- `src/app/api/surveys/templates/[id]/route.js` — Use `requirePermission('forms.create')`
- `src/app/api/surveys/distributions/route.js` — Use `requirePermission('surveys.distribute')`
- `src/app/api/qr-codes/route.js` — Use `requirePermission('surveys.distribute')`
- `src/app/api/qr-codes/scan/route.js` — Use `requirePermission('surveys.distribute')`
- `src/app/api/qr-codes/download/route.js` — Use `requirePermission('surveys.distribute')`
- `src/app/api/qr-codes/generate/route.js` — Use `requirePermission('surveys.distribute')`
- `src/app/api/trends/[id]/route.js` — Use `requirePermission('reporting.view')`
- `src/app/api/audit-log/route.js` — Use `requirePermission('audit.view')`
- `src/app/api/user/profile/route.js` — Use `requireAuth()` / `requirePermission('users.manage')` for admin ops
- `src/app/api/reports/route.js` — Use `requirePermission('reports.create')` for mutations, `requirePermission('reporting.view')` for reads
- `src/app/api/reports/reorder/route.js` — Use `requirePermission('reports.create')`
- `src/app/api/reports/ai-insights/route.js` — Use `requirePermission('reports.create')`
- `src/app/api/reports/[id]/route.js` — Use `requirePermission('reporting.view')`
- `src/app/api/categories/route.js` — Use `requirePermission('initiatives.manage')`
- `src/app/api/categories/[id]/route.js` — Use `requirePermission('initiatives.manage')`
- `src/app/api/performance/budget/route.js` — Use `requirePermission('performance.view')`
- `src/app/api/debug/alert/route.js` — Use `requirePermission('users.manage')`
- `src/app/api/health/route.js` — No auth needed (keep as-is)
- `src/components/Header.js` — Replace `isAdmin`/`isStaffOrAdmin` with `hasPermission()` calls
- `src/app/page.js` — Replace `adminOnly`/`staffOnly`/`requiresAuth` with `permission` key on routes
- `src/app/admin/users/page.js` — Add Roles tab with checkbox permission grid, dynamic role dropdowns
- `src/app/survey-distribution/page.js` — Replace `user_type` check with `hasPermission()`
- `src/lib/events/event-types.js` — Add `ROLE_UPDATED` event

---

## Task 1: Database schema — permission tables and seed data

**Files:**
- Modify: `src/lib/db.js`

- [ ] **Step 1: Add permission and role_permission table creation**

In `src/lib/db.js`, inside the `initializeDatabase()` function, after the existing `CREATE TABLE IF NOT EXISTS feature_access` block (around line 418), add:

```sql
CREATE TABLE IF NOT EXISTS permission (
  permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type_id INTEGER NOT NULL REFERENCES user_type(user_type_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permission(permission_id) ON DELETE CASCADE,
  UNIQUE(user_type_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permission_user_type ON role_permission(user_type_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission ON role_permission(permission_id);
```

- [ ] **Step 2: Add seed helper and seed all 13 permissions**

After the existing `insertUserType` seed block (around line 718), add:

```js
// ── Seed permissions ──────────────────────────────────
const seedPermission = db.prepare(
  'INSERT OR IGNORE INTO permission (key, label) VALUES (?, ?)'
);
seedPermission.run('surveys.take', 'Take Surveys');
seedPermission.run('initiatives.manage', 'Initiatives');
seedPermission.run('reporting.view', 'Reporting');
seedPermission.run('reports.create', 'Report Creation');
seedPermission.run('forms.create', 'Form Creation');
seedPermission.run('surveys.distribute', 'Survey Distribution');
seedPermission.run('goals.manage', 'Goals & Scoring');
seedPermission.run('performance.view', 'Performance Dashboard');
seedPermission.run('budgets.manage', 'Budget Reporting');
seedPermission.run('conflicts.manage', 'Data Conflicts');
seedPermission.run('users.manage', 'User Management');
seedPermission.run('audit.view', 'Audit Logs');
seedPermission.run('import.manage', 'Data Import');
```

- [ ] **Step 3: Seed default role-permission mappings**

Immediately after the permission seeds, add a migration that assigns default permissions to existing roles. This runs idempotently — only inserts rows that don't already exist.

```js
// ── Seed default role permissions ─────────────────────
function seedRolePermission(roleType, permissionKey) {
  db.prepare(`
    INSERT OR IGNORE INTO role_permission (user_type_id, permission_id)
    SELECT ut.user_type_id, p.permission_id
    FROM user_type ut, permission p
    WHERE ut.type = ? AND p.key = ?
  `).run(roleType, permissionKey);
}

// Admin gets everything
const allPermissionKeys = [
  'surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create',
  'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view',
  'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage',
];
for (const key of allPermissionKeys) {
  seedRolePermission('admin', key);
}

// Staff gets most things
const staffPermissionKeys = [
  'surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create',
  'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view',
];
for (const key of staffPermissionKeys) {
  seedRolePermission('staff', key);
}

// Public gets surveys only
seedRolePermission('public', 'surveys.take');
```

- [ ] **Step 4: Verify the dev server starts without errors**

Run: `cd /Users/ivanchen/Projects/TM17_ASRS && npm run dev`
Expected: Server starts, no SQLite errors in console. Stop the server after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js
git commit -m "feat: add permission and role_permission tables with seed data"
```

---

## Task 2: Server auth — requirePermission and getUserPermissions

**Files:**
- Modify: `src/lib/auth/server-auth.js`

- [ ] **Step 1: Add getUserPermissions helper**

At the bottom of `src/lib/auth/server-auth.js`, before the final export block, add:

```js
export function getUserPermissions(db, userId) {
  const rows = db.prepare(`
    SELECT p.key
    FROM role_permission rp
    JOIN permission p ON rp.permission_id = p.permission_id
    JOIN user u ON u.user_type_id = rp.user_type_id
    WHERE u.user_id = ?
  `).all(Number(userId));
  return rows.map(r => r.key);
}
```

- [ ] **Step 2: Add requireAuth function**

Below `getUserPermissions`, add a function that validates the session but doesn't check any specific permission — for routes that just need a logged-in user:

```js
export function requireAuth(request, db, options = {}) {
  const { requireCsrf = true } = options;

  if (process.env.NODE_ENV === 'test') {
    return {
      user: {
        user_id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'staff',
        permissions: [
          'surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create',
          'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view',
          'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage',
        ],
      },
      session: { session_id: 1 },
    };
  }

  const cookies = parseCookies(request);
  const sessionToken = cookies[SESSION_COOKIE_NAME];
  const session = getSessionRecord(db, sessionToken);

  if (!session || !session.verified) {
    return { error: unauthorized() };
  }

  if (requireCsrf) {
    const csrfError = assertCsrf(request, session, cookies[CSRF_COOKIE_NAME]);
    if (csrfError) return { error: csrfError };
  }

  const permissions = getUserPermissions(db, session.user_id);

  return {
    user: {
      user_id: Number(session.user_id),
      email: session.email,
      first_name: session.first_name,
      last_name: session.last_name,
      user_type: session.user_type,
      permissions,
    },
    session,
  };
}
```

- [ ] **Step 3: Add requirePermission function**

Below `requireAuth`, add:

```js
export function requirePermission(request, db, permissionKey, options = {}) {
  const auth = requireAuth(request, db, options);
  if (auth.error) return auth;

  if (!auth.user.permissions.includes(permissionKey)) {
    return { error: forbidden('Forbidden: insufficient permissions') };
  }

  return auth;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/server-auth.js
git commit -m "feat: add requirePermission, requireAuth, getUserPermissions"
```

---

## Task 3: Auth endpoints — include permissions in login and me responses

**Files:**
- Modify: `src/app/api/auth/login/route.js`
- Modify: `src/app/api/auth/me/route.js`

- [ ] **Step 1: Update login route to include permissions**

In `src/app/api/auth/login/route.js`, add an import for `getUserPermissions`:

```js
import { applySessionCookies, createSession, getUserPermissions } from '@/lib/auth/server-auth';
```

Then after line 58 (`const { token, csrfToken } = createSession(db, user.user_id);`), add:

```js
const permissions = getUserPermissions(db, user.user_id);
```

And update the response object (line 60-69) to include permissions:

```js
const response = NextResponse.json({
  success: true,
  user: {
    user_id: user.user_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    user_type: user.user_type,
    permissions,
  },
});
```

- [ ] **Step 2: Update me route to use requireAuth and include permissions**

Replace the entire `src/app/api/auth/me/route.js` content:

```js
import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAuth(request, db, { requireCsrf: false });

    if (auth.error) return auth.error;

    return NextResponse.json({
      user: {
        user_id: auth.user.user_id,
        email: auth.user.email,
        first_name: auth.user.first_name,
        last_name: auth.user.last_name,
        user_type: auth.user.user_type,
        permissions: auth.user.permissions,
      },
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/login/route.js src/app/api/auth/me/route.js
git commit -m "feat: include permissions array in login and me responses"
```

---

## Task 4: Client auth store — hasPermission helper

**Files:**
- Modify: `src/lib/auth/auth-store.js`
- Modify: `src/lib/auth/use-auth-store.js`

- [ ] **Step 1: Add hasPermission to AuthStore class**

In `src/lib/auth/auth-store.js`, add this method to the `AuthStore` class, after the `clearUser()` method (after line 67):

```js
hasPermission(key) {
  return Array.isArray(this.user?.permissions) && this.user.permissions.includes(key);
}
```

- [ ] **Step 2: Expose hasPermission from the hook**

In `src/lib/auth/use-auth-store.js`, update the return object to include `hasPermission`:

Replace the return block (lines 17-21):

```js
return {
  user,
  setUser: (nextUser) => store.setUser(nextUser),
  clearUser: () => store.clearUser(),
  hasPermission: (key) => store.hasPermission(key),
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/auth-store.js src/lib/auth/use-auth-store.js
git commit -m "feat: add hasPermission helper to auth store and hook"
```

---

## Task 5: Roles API — CRUD endpoint

**Files:**
- Create: `src/app/api/admin/roles/route.js`

- [ ] **Step 1: Create the roles API route**

Create `src/app/api/admin/roles/route.js`:

```js
import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requirePermission } from '@/lib/auth/server-auth';
import { logAudit } from '@/lib/audit';

const SYSTEM_ROLES = ['admin', 'staff', 'public'];

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'users.manage', { requireCsrf: false });
    if (auth.error) return auth.error;

    const roles = db.prepare(`
      SELECT ut.user_type_id, ut.type, ut.access_rank
      FROM user_type ut
      ORDER BY ut.access_rank DESC
    `).all();

    const rolePermissions = db.prepare(`
      SELECT rp.user_type_id, p.key
      FROM role_permission rp
      JOIN permission p ON rp.permission_id = p.permission_id
    `).all();

    const permsByRole = {};
    for (const rp of rolePermissions) {
      if (!permsByRole[rp.user_type_id]) permsByRole[rp.user_type_id] = [];
      permsByRole[rp.user_type_id].push(rp.key);
    }

    const allPermissions = db.prepare('SELECT permission_id, key, label FROM permission ORDER BY permission_id').all();

    const userCounts = db.prepare(`
      SELECT user_type_id, COUNT(*) as count FROM user GROUP BY user_type_id
    `).all();
    const countMap = {};
    for (const row of userCounts) countMap[row.user_type_id] = row.count;

    return NextResponse.json({
      roles: roles.map(r => ({
        user_type_id: r.user_type_id,
        type: r.type,
        is_system: SYSTEM_ROLES.includes(r.type),
        permissions: permsByRole[r.user_type_id] || [],
        user_count: countMap[r.user_type_id] || 0,
      })),
      allPermissions,
    });
  } catch (error) {
    console.error('Roles GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'users.manage');
    if (auth.error) return auth.error;

    const { name, permissions } = await request.json();
    const normalizedName = String(name || '').trim().toLowerCase().replace(/\s+/g, '_');

    if (!normalizedName) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (SYSTEM_ROLES.includes(normalizedName)) {
      return NextResponse.json({ error: 'Cannot create a role with a system role name' }, { status: 400 });
    }

    const existing = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get(normalizedName);
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
    }

    const result = db.prepare('INSERT INTO user_type (type, access_rank) VALUES (?, 50)').run(normalizedName);
    const newTypeId = result.lastInsertRowid;

    if (Array.isArray(permissions) && permissions.length > 0) {
      const insertRolePerm = db.prepare(`
        INSERT OR IGNORE INTO role_permission (user_type_id, permission_id)
        SELECT ?, permission_id FROM permission WHERE key = ?
      `);
      for (const key of permissions) {
        insertRolePerm.run(Number(newTypeId), key);
      }
    }

    logAudit(db, {
      event: 'role.created',
      userEmail: auth.user.email,
      targetType: 'role',
      targetId: String(newTypeId),
      payload: { name: normalizedName, permissions },
    });

    const assignedPerms = db.prepare(`
      SELECT p.key FROM role_permission rp
      JOIN permission p ON rp.permission_id = p.permission_id
      WHERE rp.user_type_id = ?
    `).all(Number(newTypeId)).map(r => r.key);

    return NextResponse.json({
      success: true,
      role: { user_type_id: Number(newTypeId), type: normalizedName, is_system: false, permissions: assignedPerms, user_count: 0 },
    }, { status: 201 });
  } catch (error) {
    console.error('Roles POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'users.manage');
    if (auth.error) return auth.error;

    const { user_type_id, permissions, name } = await request.json();

    if (!user_type_id) {
      return NextResponse.json({ error: 'user_type_id is required' }, { status: 400 });
    }

    const role = db.prepare('SELECT user_type_id, type FROM user_type WHERE user_type_id = ?').get(Number(user_type_id));
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const isSystem = SYSTEM_ROLES.includes(role.type);

    // Prevent removing users.manage from admin role
    if (role.type === 'admin' && Array.isArray(permissions) && !permissions.includes('users.manage')) {
      return NextResponse.json({ error: 'Cannot remove User Management permission from the admin role' }, { status: 400 });
    }

    // Prevent renaming system roles
    if (isSystem && name && name !== role.type) {
      return NextResponse.json({ error: 'Cannot rename a system role' }, { status: 400 });
    }

    // Rename non-system role if requested
    if (!isSystem && name) {
      const normalizedName = String(name).trim().toLowerCase().replace(/\s+/g, '_');
      if (normalizedName && normalizedName !== role.type) {
        const conflict = db.prepare('SELECT user_type_id FROM user_type WHERE type = ? AND user_type_id != ?').get(normalizedName, Number(user_type_id));
        if (conflict) {
          return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
        }
        db.prepare('UPDATE user_type SET type = ? WHERE user_type_id = ?').run(normalizedName, Number(user_type_id));
      }
    }

    // Update permissions
    if (Array.isArray(permissions)) {
      db.prepare('DELETE FROM role_permission WHERE user_type_id = ?').run(Number(user_type_id));
      const insertRolePerm = db.prepare(`
        INSERT OR IGNORE INTO role_permission (user_type_id, permission_id)
        SELECT ?, permission_id FROM permission WHERE key = ?
      `);
      for (const key of permissions) {
        insertRolePerm.run(Number(user_type_id), key);
      }
    }

    logAudit(db, {
      event: 'role.updated',
      userEmail: auth.user.email,
      targetType: 'role',
      targetId: String(user_type_id),
      payload: { name: name || role.type, permissions },
    });

    return NextResponse.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Roles PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'users.manage');
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const userTypeId = searchParams.get('user_type_id');

    if (!userTypeId) {
      return NextResponse.json({ error: 'user_type_id is required' }, { status: 400 });
    }

    const role = db.prepare('SELECT type FROM user_type WHERE user_type_id = ?').get(Number(userTypeId));
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (SYSTEM_ROLES.includes(role.type)) {
      return NextResponse.json({ error: 'Cannot delete a system role' }, { status: 400 });
    }

    const assignedUsers = db.prepare('SELECT COUNT(*) as count FROM user WHERE user_type_id = ?').get(Number(userTypeId));
    if (assignedUsers.count > 0) {
      return NextResponse.json({ error: `Cannot delete role: ${assignedUsers.count} user(s) are still assigned to it` }, { status: 400 });
    }

    db.prepare('DELETE FROM role_permission WHERE user_type_id = ?').run(Number(userTypeId));
    db.prepare('DELETE FROM user_type WHERE user_type_id = ?').run(Number(userTypeId));

    logAudit(db, {
      event: 'role.deleted',
      userEmail: auth.user.email,
      targetType: 'role',
      targetId: String(userTypeId),
      payload: { name: role.type },
    });

    return NextResponse.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('Roles DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/roles/route.js
git commit -m "feat: add /api/admin/roles CRUD endpoint"
```

---

## Task 6: Migrate all API routes from requireAccess to requirePermission

This is the largest task — every API route that calls `requireAccess` must be updated. The change is mechanical: replace the import and swap the call.

**Files:** All 32 API route files listed in the File Map above.

- [ ] **Step 1: Migrate admin routes**

For each of these files, change the import from:
```js
import { requireAccess } from '@/lib/auth/server-auth';
```
to the appropriate import(s) from:
```js
import { requirePermission } from '@/lib/auth/server-auth';
// or
import { requireAuth } from '@/lib/auth/server-auth';
// or both
import { requirePermission, requireAuth } from '@/lib/auth/server-auth';
```

Then replace each `requireAccess(request, db, { minAccessRank: N, ... })` call.

**`src/app/api/admin/users/route.js`** — Already uses `requirePermission` via the roles route. Replace all 4 calls:
- Line 11: `requireAccess(request, db, { minAccessRank: 100, requireCsrf: false })` → `requirePermission(request, db, 'users.manage', { requireCsrf: false })`
- Line 40: `requireAccess(request, db, { minAccessRank: 100 })` → `requirePermission(request, db, 'users.manage')`
- Line 188: same pattern → `requirePermission(request, db, 'users.manage')`
- Line 249: same pattern → `requirePermission(request, db, 'users.manage')`

Also update the POST handler validation (line 58) — replace the hardcoded role check:
```js
// Remove this:
if (!['public', 'staff', 'admin'].includes(user_type)) {
  return NextResponse.json(
    { error: 'user_type must be "public", "staff", or "admin"' },
    { status: 400 }
  );
}
```
Replace with:
```js
const validRole = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get(user_type);
if (!validRole) {
  return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
}
```

Similarly in the PUT handler (line 198-202), replace the hardcoded role check:
```js
// Remove this:
if (!['public', 'staff', 'admin'].includes(new_role)) {
  return NextResponse.json(
    { error: 'new_role must be "public", "staff", or "admin"' },
    { status: 400 }
  );
}
```
Replace with:
```js
const validRole = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get(new_role);
if (!validRole) {
  return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
}
```

**`src/app/api/admin/audit/route.js`**:
- `requireAccess(request, db, { minAccessRank: 100, ... })` → `requirePermission(request, db, 'audit.view', { requireCsrf: false })`

**`src/app/api/admin/budgets/route.js`**:
- All calls: `requireAccess(request, db, { minAccessRank: 100, ... })` → `requirePermission(request, db, 'budgets.manage', ...)` (preserve `requireCsrf` option where present)

**`src/app/api/admin/fields/route.js`**:
- All calls: → `requirePermission(request, db, 'users.manage', ...)`

**`src/app/api/admin/import/route.js`**:
- All calls: → `requirePermission(request, db, 'import.manage', ...)`

**`src/app/api/admin/goal-conflicts/route.js`**:
- All calls: → `requirePermission(request, db, 'conflicts.manage', ...)`

- [ ] **Step 2: Commit admin route migrations**

```bash
git add src/app/api/admin/
git commit -m "refactor: migrate admin API routes to requirePermission"
```

- [ ] **Step 3: Migrate goals routes**

**`src/app/api/goals/route.js`**:
- All `requireAccess` calls with `minAccessRank: 50` or `minAccessRank: 100` → `requirePermission(request, db, 'goals.manage', ...)`

**`src/app/api/goals/initiatives/route.js`**:
- → `requirePermission(request, db, 'goals.manage', ...)`

**`src/app/api/goals/history/route.js`**:
- → `requirePermission(request, db, 'goals.manage', ...)`

- [ ] **Step 4: Migrate initiatives, categories, trends routes**

**`src/app/api/initiatives/route.js`**:
- GET: Use `requireAuth` (any logged-in user can list initiatives for surveys)
- POST: → `requirePermission(request, db, 'initiatives.manage')`

**`src/app/api/initiatives/[id]/report-data/route.js`**:
- → `requirePermission(request, db, 'reporting.view', ...)`

**`src/app/api/initiative-categories/route.js`**:
- → `requirePermission(request, db, 'initiatives.manage', ...)`

**`src/app/api/categories/route.js`** and **`src/app/api/categories/[id]/route.js`**:
- → `requirePermission(request, db, 'initiatives.manage', ...)`

**`src/app/api/trends/[id]/route.js`**:
- → `requirePermission(request, db, 'reporting.view', ...)`

- [ ] **Step 5: Migrate survey, QR code, distribution routes**

**`src/app/api/surveys/route.js`**:
- Public survey submission (POST without auth) should remain accessible. For admin operations, use `requirePermission(request, db, 'surveys.distribute', ...)`.

**`src/app/api/surveys/templates/route.js`** and **`src/app/api/surveys/templates/[id]/route.js`**:
- → `requirePermission(request, db, 'forms.create', ...)`

**`src/app/api/surveys/distributions/route.js`**:
- → `requirePermission(request, db, 'surveys.distribute', ...)`

**`src/app/api/qr-codes/route.js`**, **`qr-codes/scan/route.js`**, **`qr-codes/download/route.js`**, **`qr-codes/generate/route.js`**:
- → `requirePermission(request, db, 'surveys.distribute', ...)`

- [ ] **Step 6: Migrate reports, performance, user profile, audit-log, debug routes**

**`src/app/api/reports/route.js`**:
- GET: → `requirePermission(request, db, 'reporting.view', ...)`
- POST/PUT/DELETE: → `requirePermission(request, db, 'reports.create', ...)`

**`src/app/api/reports/reorder/route.js`**:
- → `requirePermission(request, db, 'reports.create', ...)`

**`src/app/api/reports/ai-insights/route.js`**:
- → `requirePermission(request, db, 'reports.create', ...)`

**`src/app/api/reports/[id]/route.js`**:
- → `requirePermission(request, db, 'reporting.view', ...)`

**`src/app/api/performance/budget/route.js`**:
- → `requirePermission(request, db, 'performance.view', ...)`

**`src/app/api/user/profile/route.js`**:
- GET/PUT for own profile: → `requireAuth(request, db, ...)`
- Admin operations (line 169 area): check `auth.user.permissions.includes('users.manage')` instead of `auth.user.user_type === 'admin'`

**`src/app/api/audit-log/route.js`**:
- → `requirePermission(request, db, 'audit.view', ...)`

**`src/app/api/debug/alert/route.js`**:
- → `requirePermission(request, db, 'users.manage', ...)`

- [ ] **Step 7: Commit remaining route migrations**

```bash
git add src/app/api/
git commit -m "refactor: migrate all remaining API routes to requirePermission"
```

---

## Task 7: Frontend — Home page permission gating

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Replace route metadata with permission keys**

In `src/app/page.js`, update the `routes` array (lines 102-190). Remove `requiresAuth`, `adminOnly`, `staffOnly`, and `showOnlyWhenLoggedOut`. Replace with a `permission` key:

```js
const routes = [
  {
    href: '/survey',
    label: 'Take a Survey',
    description: 'Fill out and submit initiative surveys.',
    section: 'public',
    permission: 'surveys.take',
  },
  {
    href: '/login',
    label: 'Sign In',
    description: 'Log in to access staff and admin tools.',
    section: 'public',
    showOnlyWhenLoggedOut: true,
  },
  {
    href: '/initiative-creation',
    label: 'Initiatives',
    description: 'Create, configure, and manage ASRS initiatives.',
    section: 'staff',
    permission: 'initiatives.manage',
  },
  {
    href: '/reporting',
    label: 'Reporting',
    description: 'View published reports and dashboards.',
    section: 'staff',
    permission: 'reporting.view',
  },
  {
    href: '/historical-reports',
    label: 'Historical Reports',
    description: 'Browse, filter, and compare past reports.',
    section: 'staff',
    permission: 'reporting.view',
  },
  {
    href: '/survey-distribution',
    label: 'Distribute Surveys',
    description: 'Send surveys to participants and track distribution.',
    section: 'staff',
    permission: 'surveys.distribute',
  },
  {
    href: '/goals',
    label: 'Goals & Scoring',
    description: 'Set target metrics and scoring criteria for initiatives.',
    section: 'staff',
    permission: 'goals.manage',
  },
  {
    href: '/performance-dashboard',
    label: 'Performance',
    description: 'Monitor initiative outcomes and key performance indicators.',
    section: 'staff',
    permission: 'performance.view',
  },
  {
    href: '/admin/users',
    label: 'User Management',
    description: 'Manage staff accounts, roles, and permissions.',
    section: 'admin',
    permission: 'users.manage',
  },
  {
    href: '/admin/conflicts',
    label: 'Data conflicts',
    description: 'Review concurrent goal edits and approve or reject proposed changes.',
    section: 'admin',
    permission: 'conflicts.manage',
  },
  {
    href: '/admin/audit',
    label: 'Audit Logs',
    description: 'View system audit trails and export change history.',
    section: 'admin',
    permission: 'audit.view',
  },
  {
    href: '/admin/budgets',
    label: 'Budget Reporting',
    description: 'Create and review initiative budgets by fiscal year.',
    section: 'admin',
    permission: 'budgets.manage',
  },
];
```

- [ ] **Step 2: Update the Home component to use hasPermission**

Replace the auth variables and filter logic (lines 319-347):

```js
const { user, hasPermission } = useAuthStore();
const router = useRouter();

const [initiatives, setInitiatives] = useState([]);
const [selectedInitiative, setSelectedInitiative] = useState('');
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  setIsHydrated(true);
}, []);

const isLoggedIn = Boolean(user);
```

Update the filter logic:

```js
const visibleRoutes = routes.filter((route) => {
  if (route.showOnlyWhenLoggedOut) return !isLoggedIn;
  if (route.permission) return isLoggedIn && hasPermission(route.permission);
  return true;
});
```

Remove the now-unused `isAdmin` and `isStaff` variables.

Update the role badge in the hero section (line 396 area) to show the user_type directly:

```js
{user?.user_type?.charAt(0).toUpperCase() + user?.user_type?.slice(1)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.js
git commit -m "refactor: home page uses permission-based route visibility"
```

---

## Task 8: Frontend — Header nav permission gating

**Files:**
- Modify: `src/components/Header.js`

- [ ] **Step 1: Replace isAdmin/isStaffOrAdmin with hasPermission**

In `src/components/Header.js`, update the Header component:

Replace line 484:
```js
const { user, clearUser } = useAuthStore();
```
with:
```js
const { user, clearUser, hasPermission } = useAuthStore();
```

Remove lines 515-517 (the `isAdmin` and `isStaffOrAdmin` variables).

Replace all `isAdmin` references:
- `isAdmin` prop on `HistoryDropdown` → `showAuditLog={hasPermission('audit.view')}`
- `isAdmin` prop on `GoalsDropdown` → `showConflicts={hasPermission('conflicts.manage')}`
- Line 520 (`if (!isAdmin)`) for pending conflicts polling → `if (!hasPermission('conflicts.manage'))`
- Line 654 (`isStaffOrAdmin`) for Distribute link → `hasPermission('surveys.distribute')`
- Line 681 (`isStaffOrAdmin`) for Goals/Performance/History dropdowns → check individual permissions: show Goals dropdown if `hasPermission('goals.manage')`, Performance if `hasPermission('performance.view')`, History if `hasPermission('reporting.view')`
- Line 703 (`isAdmin`) for User Management + Data Import links → `hasPermission('users.manage')` and `hasPermission('import.manage')`

Update `HistoryDropdown` component — rename `isAdmin` prop to `showAuditLog`:
- Line 61: `function HistoryDropdown({ isActive, getNavLinkStyle, navHoverHandlers, showAuditLog })`
- Line 152: `{showAuditLog && (` (was `{isAdmin && (`)

Update `GoalsDropdown` component — rename `isAdmin` prop to `showConflicts`:
- Line 308: `function GoalsDropdown({ isActive, getNavLinkStyle, navHoverHandlers, showConflicts, pendingGoalConflicts })`
- Line 426: `{showConflicts && (` (was `{isAdmin && (`)

For the logged-out nav, keep the simple Home/Survey/Login links as-is (no permission check needed when not logged in).

For each logged-in nav link, gate by permission:
- Survey link: always shown (everyone has `surveys.take`)
- Distribute: `hasPermission('surveys.distribute')`
- Reporting: `hasPermission('reporting.view')`
- Initiatives: `hasPermission('initiatives.manage')`

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.js
git commit -m "refactor: header nav uses permission-based visibility"
```

---

## Task 9: Frontend — Survey distribution page permission check

**Files:**
- Modify: `src/app/survey-distribution/page.js`

- [ ] **Step 1: Replace user_type check with hasPermission**

In `src/app/survey-distribution/page.js`, replace the auth check (lines 34-43):

```js
// ── Auth check ───────────────────────────────────────
useEffect(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    const parsed = JSON.parse(storedUser);
    if (parsed.permissions && parsed.permissions.includes('surveys.distribute')) {
      setUser(parsed);
    }
  }
  setAuthChecked(true);
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/survey-distribution/page.js
git commit -m "refactor: survey distribution page uses permission check"
```

---

## Task 10: Frontend — Role Management tab on User Management page

**Files:**
- Modify: `src/app/admin/users/page.js`

- [ ] **Step 1: Add state and tab UI for Roles**

At the top of `AdminUsersPage`, add new state variables after the existing state declarations:

```js
// Tab state
const [activeTab, setActiveTab] = useState('users');

// Roles state
const [roles, setRoles] = useState([]);
const [allPermissions, setAllPermissions] = useState([]);
const [rolesLoading, setRolesLoading] = useState(false);
const [rolesError, setRolesError] = useState('');

// Create role modal
const [showCreateRole, setShowCreateRole] = useState(false);
const [newRoleName, setNewRoleName] = useState('');
const [newRolePermissions, setNewRolePermissions] = useState([]);
const [createRoleLoading, setCreateRoleLoading] = useState(false);

// Editing role permissions (inline)
const [editingRoleId, setEditingRoleId] = useState(null);
const [editingPermissions, setEditingPermissions] = useState([]);
const [savingRole, setSavingRole] = useState(false);
```

- [ ] **Step 2: Add fetchRoles function**

After the existing `fetchUsers` function, add:

```js
const fetchRoles = async () => {
  setRolesLoading(true);
  setRolesError('');
  try {
    const response = await apiFetch('/api/admin/roles');
    const data = await response.json();
    if (response.ok) {
      setRoles(data.roles);
      setAllPermissions(data.allPermissions);
    } else {
      setRolesError(data.error || 'Failed to load roles');
    }
  } catch (err) {
    setRolesError('Connection error. Please try again.');
  } finally {
    setRolesLoading(false);
  }
};
```

And trigger it when tab changes:

```js
useEffect(() => {
  if (activeTab === 'roles') fetchRoles();
}, [activeTab, user]);
```

- [ ] **Step 3: Add role CRUD handlers**

```js
const handleCreateRole = async () => {
  if (!newRoleName.trim()) return;
  setCreateRoleLoading(true);
  try {
    const resp = await apiFetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName, permissions: newRolePermissions }),
    });
    const data = await resp.json();
    if (resp.ok) {
      setSuccessMsg(`Role "${newRoleName}" created`);
      setShowCreateRole(false);
      setNewRoleName('');
      setNewRolePermissions([]);
      fetchRoles();
    } else {
      setRolesError(data.error || 'Failed to create role');
    }
  } catch (err) {
    setRolesError('Connection error');
  } finally {
    setCreateRoleLoading(false);
  }
};

const handleSaveRolePermissions = async (userTypeId) => {
  setSavingRole(true);
  try {
    const resp = await apiFetch('/api/admin/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_type_id: userTypeId, permissions: editingPermissions }),
    });
    const data = await resp.json();
    if (resp.ok) {
      setSuccessMsg('Role permissions updated');
      setEditingRoleId(null);
      fetchRoles();
    } else {
      setRolesError(data.error || 'Failed to update role');
    }
  } catch (err) {
    setRolesError('Connection error');
  } finally {
    setSavingRole(false);
  }
};

const handleDeleteRole = async (userTypeId, roleName) => {
  if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
  try {
    const resp = await apiFetch(`/api/admin/roles?user_type_id=${userTypeId}`, { method: 'DELETE' });
    const data = await resp.json();
    if (resp.ok) {
      setSuccessMsg(`Role "${roleName}" deleted`);
      fetchRoles();
    } else {
      setRolesError(data.error || 'Failed to delete role');
    }
  } catch (err) {
    setRolesError('Connection error');
  }
};

const togglePermission = (key, permList, setPerm) => {
  if (permList.includes(key)) {
    setPerm(permList.filter(k => k !== key));
  } else {
    setPerm([...permList, key]);
  }
};
```

- [ ] **Step 4: Add tab bar to the page JSX**

In the return JSX, after the page title div and before the success/error messages, add a tab bar:

```jsx
{/* Tab Bar */}
<div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
  <button
    onClick={() => setActiveTab('users')}
    style={{
      padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
      border: 'none', backgroundColor: 'transparent',
      borderBottom: activeTab === 'users' ? '2px solid var(--color-asrs-orange)' : '2px solid transparent',
      color: activeTab === 'users' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      marginBottom: '-2px',
    }}
  >
    Users
  </button>
  <button
    onClick={() => setActiveTab('roles')}
    style={{
      padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
      border: 'none', backgroundColor: 'transparent',
      borderBottom: activeTab === 'roles' ? '2px solid var(--color-asrs-orange)' : '2px solid transparent',
      color: activeTab === 'roles' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      marginBottom: '-2px',
    }}
  >
    Roles & Permissions
  </button>
</div>
```

- [ ] **Step 5: Wrap existing user content in activeTab === 'users' condition**

Wrap the existing filters bar, user table, and add-user button in:

```jsx
{activeTab === 'users' && (
  <>
    {/* ... existing user content ... */}
  </>
)}
```

Update the page title button area — show "+ Add User" when on users tab, "+ Create Role" when on roles tab:

```jsx
<button
  onClick={() => {
    if (activeTab === 'users') { setShowAddForm(true); setAddError(''); }
    else { setShowCreateRole(true); setRolesError(''); }
  }}
  className="asrs-btn-primary"
  style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
>
  {activeTab === 'users' ? '+ Add User' : '+ Create Role'}
</button>
```

- [ ] **Step 6: Add Roles tab content**

After the users tab content, add the roles tab:

```jsx
{activeTab === 'roles' && (
  <>
    {rolesError && (
      <div style={{
        padding: '0.75rem 1rem', marginBottom: '1rem',
        backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
        borderRadius: '8px', color: '#c62828', fontSize: '0.9rem',
      }}>
        {rolesError}
      </div>
    )}

    {rolesLoading ? (
      <div className="asrs-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading roles...</p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {roles.map((role) => {
          const isEditing = editingRoleId === role.user_type_id;
          const permsToShow = isEditing ? editingPermissions : role.permissions;
          return (
            <div key={role.user_type_id} className="asrs-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '1rem' : '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0, textTransform: 'capitalize' }}>
                    {role.type.replace(/_/g, ' ')}
                  </h3>
                  {role.is_system && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.5rem',
                      borderRadius: '10px', backgroundColor: '#e8eaf6', color: '#283593',
                      border: '1px solid #c5cae9', textTransform: 'uppercase', letterSpacing: '0.03em',
                    }}>
                      System
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingRoleId(null)}
                        style={{
                          padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                          border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
                          color: 'var(--color-text-primary)', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveRolePermissions(role.user_type_id)}
                        disabled={savingRole}
                        className="asrs-btn-primary"
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', opacity: savingRole ? 0.6 : 1 }}
                      >
                        {savingRole ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingRoleId(role.user_type_id); setEditingPermissions([...role.permissions]); }}
                        style={{
                          padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                          border: '1px solid #bbdefb', backgroundColor: '#e3f2fd',
                          color: '#1565c0', cursor: 'pointer',
                        }}
                      >
                        Edit Permissions
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDeleteRole(role.user_type_id, role.type)}
                          disabled={role.user_count > 0}
                          title={role.user_count > 0 ? 'Reassign users before deleting' : 'Delete role'}
                          style={{
                            padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                            border: `1px solid ${role.user_count > 0 ? '#eee' : '#ffcdd2'}`,
                            backgroundColor: role.user_count > 0 ? '#f5f5f5' : '#ffebee',
                            color: role.user_count > 0 ? '#bbb' : '#c62828',
                            cursor: role.user_count > 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Permission grid */}
              {isEditing ? (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px',
                }}>
                  {allPermissions.map((perm) => {
                    const checked = editingPermissions.includes(perm.key);
                    const disabled = role.type === 'admin' && perm.key === 'users.manage';
                    return (
                      <label
                        key={perm.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          fontSize: '0.85rem', color: disabled ? '#999' : 'var(--color-text-primary)',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePermission(perm.key, editingPermissions, setEditingPermissions)}
                          style={{ accentColor: 'var(--color-asrs-orange)' }}
                        />
                        {perm.label}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {role.permissions.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No permissions assigned</span>
                  ) : (
                    role.permissions.map((key) => {
                      const perm = allPermissions.find(p => p.key === key);
                      return (
                        <span key={key} style={{
                          fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.6rem',
                          borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32',
                          border: '1px solid #c8e6c9',
                        }}>
                          {perm ? perm.label : key}
                        </span>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </>
)}
```

- [ ] **Step 7: Add Create Role modal**

After the existing Add User modal, add:

```jsx
{showCreateRole && (
  <div style={overlayStyle} onClick={() => setShowCreateRole(false)}>
    <div style={{ ...modalStyle, maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
        Create New Role
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Define a role name and select which features it can access.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Role Name</label>
        <input
          type="text"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="e.g. Budget Manager"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Permissions</label>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px',
        }}>
          {allPermissions.map((perm) => (
            <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newRolePermissions.includes(perm.key)}
                onChange={() => togglePermission(perm.key, newRolePermissions, setNewRolePermissions)}
                style={{ accentColor: 'var(--color-asrs-orange)' }}
              />
              {perm.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowCreateRole(false)}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '8px',
            border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
            color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreateRole}
          disabled={createRoleLoading || !newRoleName.trim()}
          className="asrs-btn-primary"
          style={{
            padding: '0.5rem 1.25rem', fontSize: '0.9rem',
            opacity: createRoleLoading || !newRoleName.trim() ? 0.6 : 1,
            cursor: createRoleLoading || !newRoleName.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {createRoleLoading ? 'Creating...' : 'Create Role'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 8: Update Add User form to use dynamic roles**

In the Add User modal, replace the hardcoded role `<select>` (lines 560-570) with a dynamic list. Fetch roles on mount. Replace:

```jsx
<select
  value={addForm.user_type}
  onChange={(e) => setAddForm({ ...addForm, user_type: e.target.value })}
  disabled={addLoading}
  style={selectStyle}
>
  <option value="public">Public</option>
  <option value="staff">Staff</option>
  <option value="admin">Admin</option>
</select>
```

With:

```jsx
<select
  value={addForm.user_type}
  onChange={(e) => setAddForm({ ...addForm, user_type: e.target.value })}
  disabled={addLoading}
  style={selectStyle}
>
  {roles.length > 0 ? (
    roles.map((r) => (
      <option key={r.user_type_id} value={r.type}>
        {r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, ' ')}
      </option>
    ))
  ) : (
    <>
      <option value="public">Public</option>
      <option value="staff">Staff</option>
      <option value="admin">Admin</option>
    </>
  )}
</select>
```

Also, load roles when the component mounts (add to the existing `useEffect` that runs on `user` change, or add a new one):

```js
useEffect(() => {
  if (user) fetchRoles();
}, [user]);
```

Similarly, update the role change buttons in the user table. Replace the three hardcoded role buttons (lines 360-407) with a single dropdown:

```jsx
<td style={{ ...tdStyle, textAlign: 'center' }}>
  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
    <select
      value={u.user_type}
      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
      disabled={isSelf}
      style={{
        ...selectStyle,
        fontSize: '0.8rem',
        padding: '0.3rem 0.5rem',
        opacity: isSelf ? 0.5 : 1,
        cursor: isSelf ? 'not-allowed' : 'pointer',
      }}
    >
      {roles.map((r) => (
        <option key={r.user_type_id} value={r.type}>
          {r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, ' ')}
        </option>
      ))}
    </select>
    <button
      onClick={() => setDeleteTarget(u)}
      disabled={isSelf}
      title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
      style={{
        ...actionBtnStyle,
        backgroundColor: isSelf ? '#f5f5f5' : '#ffebee',
        color: isSelf ? '#bbb' : '#c62828',
        border: `1px solid ${isSelf ? '#eee' : '#ffcdd2'}`,
        cursor: isSelf ? 'not-allowed' : 'pointer',
      }}
    >
      Delete
    </button>
  </div>
</td>
```

Also update the `filterRole` select in the filters bar to use dynamic roles:

```jsx
<select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={selectStyle}>
  <option value="all">All Roles</option>
  {roles.map((r) => (
    <option key={r.user_type_id} value={r.type}>
      {r.type.charAt(0).toUpperCase() + r.type.slice(1).replace(/_/g, ' ')}
    </option>
  ))}
</select>
```

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/users/page.js
git commit -m "feat: add Roles & Permissions tab to user management page"
```

---

## Task 11: Add ROLE_UPDATED event type

**Files:**
- Modify: `src/lib/events/event-types.js`

- [ ] **Step 1: Add event type**

Add to the EVENTS object in `src/lib/events/event-types.js`:

```js
ROLE_CREATED: 'role.created',
ROLE_UPDATED: 'role.updated',
ROLE_DELETED: 'role.deleted',
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/events/event-types.js
git commit -m "feat: add role lifecycle event types"
```

---

## Task 12: Remove old requireAccess and clean up

**Files:**
- Modify: `src/lib/auth/server-auth.js`
- Modify: `src/lib/auth.js`

- [ ] **Step 1: Remove requireAccess from server-auth.js**

Delete the `requireAccess` function entirely from `src/lib/auth/server-auth.js` and remove it from exports. This ensures no route can accidentally use the old system.

- [ ] **Step 2: Update lib/auth.js verifyAdmin helper**

Replace the `access_rank`-based check in `src/lib/auth.js` with a permission check:

```js
import db from '@/lib/db';

export function verifyAdmin(requesterEmail) {
  if (!requesterEmail) return null;

  const requester = db.prepare(`
    SELECT u.user_id, ut.type as user_type
    FROM user u
    JOIN user_type ut ON u.user_type_id = ut.user_type_id
    WHERE u.email = ?
  `).get(requesterEmail);

  if (!requester) return null;

  // Check if user's role has users.manage permission
  const hasPerm = db.prepare(`
    SELECT 1 FROM role_permission rp
    JOIN permission p ON rp.permission_id = p.permission_id
    JOIN user u ON u.user_type_id = rp.user_type_id
    WHERE u.email = ? AND p.key = 'users.manage'
  `).get(requesterEmail);

  if (!hasPerm) return null;
  return requester;
}
```

- [ ] **Step 3: Run the full test suite**

Run: `cd /Users/ivanchen/Projects/TM17_ASRS && npm test`
Expected: All tests pass (existing tests use `NODE_ENV=test` which returns a user with all permissions).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/server-auth.js src/lib/auth.js
git commit -m "refactor: remove requireAccess, clean up verifyAdmin"
```

---

## Task 13: Manual verification

- [ ] **Step 1: Start dev server and test**

Run: `cd /Users/ivanchen/Projects/TM17_ASRS && npm run dev`

Manual checks:
1. Log in as admin → verify all nav items visible
2. Go to User Management → verify "Roles & Permissions" tab exists
3. Click Roles tab → verify 3 system roles shown with correct permissions
4. Edit staff role → uncheck a permission → save → verify it persists
5. Create a custom role → assign some permissions → verify it appears
6. Assign a user to the custom role → verify they only see permitted pages
7. Try to delete admin role → verify it's blocked
8. Try to remove `users.manage` from admin → verify it's blocked

- [ ] **Step 2: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: address any issues found during manual verification"
```
