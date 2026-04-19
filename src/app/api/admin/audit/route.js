import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requirePermission } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'audit.view', { requireCsrf: false });
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const params = url.searchParams;

    const q          = params.get('q') || '';
    const dateFrom   = params.get('date_from') || '';
    const dateTo     = params.get('date_to') || '';
    const limit      = Math.min(Number(params.get('limit')  || 50),  1000);
    const offset     = Number(params.get('offset') || 0);
    const exportCsv  = params.get('export') === 'csv';

    const where  = [];
    const binds  = [];

    if (q) {
      // Match against every column visible in the UI:
      // user_email, event, target_type, target_id, and payload (covers Details)
      where.push('(user_email LIKE ? OR event LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR payload LIKE ?)');
      const like = `%${q}%`;
      binds.push(like, like, like, like, like);
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

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM audit_log ${whereSql}`).get(...binds);
    const total = countRow ? countRow.count : 0;

    if (exportCsv) {
      const allRows = db.prepare(`
        SELECT audit_id, event, user_email, target_type, target_id, payload, created_at
        FROM audit_log
        ${whereSql}
        ORDER BY created_at DESC
      `).all(...binds);

      const header = ['audit_id', 'created_at', 'event', 'user_email', 'target_type', 'target_id', 'payload'];
      const escapeCell = (v) => {
        if (v == null) return '';
        const s = typeof v === 'string' ? v : String(v);
        return s.includes(',') || s.includes('\n') || s.includes('"')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const lines = [header.join(',')];
      for (const r of allRows) {
        lines.push([r.audit_id, r.created_at, r.event, r.user_email, r.target_type, r.target_id, r.payload].map(escapeCell).join(','));
      }

      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_log_export_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const rows = db.prepare(`
      SELECT audit_id, event, user_email, target_type, target_id, payload, created_at
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
