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

    const userCounts = db.prepare(
      'SELECT user_type_id, COUNT(*) as count FROM user GROUP BY user_type_id'
    ).all();
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
      role: {
        user_type_id: Number(newTypeId),
        type: normalizedName,
        is_system: false,
        permissions: assignedPerms,
        user_count: 0,
      },
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

    if (role.type === 'admin' && Array.isArray(permissions) && !permissions.includes('users.manage')) {
      return NextResponse.json({ error: 'Cannot remove User Management permission from the admin role' }, { status: 400 });
    }

    if (isSystem && name && name !== role.type) {
      return NextResponse.json({ error: 'Cannot rename a system role' }, { status: 400 });
    }

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
      return NextResponse.json(
        { error: `Cannot delete role: ${assignedUsers.count} user(s) are still assigned to it` },
        { status: 400 }
      );
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
