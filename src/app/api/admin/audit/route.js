import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requireAccess } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAccess(request, db, { minAccessRank: 100, requireCsrf: false });
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const params = url.searchParams;
    const q = params.get('q'); // general search across user_email and event
    const userEmail = params.get('user_email');
    const event = params.get('event');
    const targetType = params.get('target_type');
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');
    const limit = Math.min(Number(params.get('limit') || 100), 1000);
    const offset = Number(params.get('offset') || 0);
    const exportCsv = params.get('export') === 'csv';

    const where = [];
    const binds = [];

    if (q) {
      where.push('(user_email LIKE ? OR event LIKE ? OR payload LIKE ?)');
      const like = `%${q}%`;
      binds.push(like, like, like);
    }
    if (userEmail) {
      where.push('user_email = ?');
      binds.push(userEmail);
    }
    if (event) {
      where.push('event = ?');
      binds.push(event);
    }
    if (targetType) {
      where.push('target_type = ?');
      binds.push(targetType);
    }
    if (dateFrom) {
      where.push('DATE(created_at) >= DATE(?)');
      binds.push(dateFrom);
    }
    if (dateTo) {
      where.push('DATE(created_at) <= DATE(?)');
      binds.push(dateTo);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Total count
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM audit_log ${whereSql}`).get(...binds);
    const total = countRow ? countRow.count : 0;

    if (exportCsv) {
      // Export ALL matching rows (no pagination) so admins get the full dataset
      const allRows = db.prepare(`
        SELECT audit_id, event, user_email, target_type, target_id, reason_type, reason_text, payload, created_at
        FROM audit_log
        ${whereSql}
        ORDER BY created_at DESC
      `).all(...binds);

      // Build CSV
      const header = ['audit_id', 'created_at', 'event', 'user_email', 'target_type', 'target_id', 'reason_type', 'reason_text', 'payload'];
      const escapeCell = (v) => {
        if (v == null) return '';
        const s = typeof v === 'string' ? v : String(v);
        if (s.includes(',') || s.includes('\n') || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };
      const lines = [header.join(',')];
      for (const r of allRows) {
        lines.push([
          escapeCell(r.audit_id),
          escapeCell(r.created_at),
          escapeCell(r.event),
          escapeCell(r.user_email),
          escapeCell(r.target_type),
          escapeCell(r.target_id),
          escapeCell(r.reason_type),
          escapeCell(r.reason_text),
          escapeCell(r.payload),
        ].join(','));
      }
      const csv = lines.join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_log_export_${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    // List rows (ordered by created_at desc) with pagination
    const rows = db.prepare(`
      SELECT audit_id, event, user_email, target_type, target_id, reason_type, reason_text, payload, created_at
      FROM audit_log
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...binds, limit, offset);

    return NextResponse.json({ success: true, total, rows });
  } catch (error) {
    console.error('/api/admin/audit GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
