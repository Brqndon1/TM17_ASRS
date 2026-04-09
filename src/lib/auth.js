import db from '@/lib/db';
import { getUserPermissions } from '@/lib/auth/server-auth';

export function verifyAdmin(requesterEmail) {
    if (!requesterEmail) return null;

    const requester = db.prepare(`
      SELECT u.user_id, ut.type as user_type
      FROM user u
      JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.email = ?
    `).get(requesterEmail);

    if (!requester) return null;

    const permissions = getUserPermissions(db, requester.user_id);
    if (!permissions.includes('users.manage')) return null;

    return requester;
  }