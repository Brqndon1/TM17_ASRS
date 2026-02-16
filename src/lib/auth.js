import db from '@/lib/db';

export function verifyAdmin(requesterEmail) {
    if (!requesterEmail) return null;
  
    const requester = db.prepare(`
      SELECT u.user_id, ut.type as user_type
      FROM user u
      JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.email = ?
    `).get(requesterEmail);
  
    if (!requester || requester.user_type !== 'admin') return null;
    return requester;
  }