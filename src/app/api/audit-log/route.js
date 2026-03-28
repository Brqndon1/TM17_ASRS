import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { requireAccess } from '@/lib/auth/server-auth';

/**
 * GET /api/audit-log
 *
 * Query params:
 *   page        – 1-based page number (default 1)
 *   limit       – rows per page (default 50, max 200)
 *   action      – filter by action verb (e.g. "created", "updated", "deleted")
 *   entity      – filter by target_type (e.g. "goal", "initiative", "report")
 *   startDate   – ISO date string, inclusive lower bound on created_at
 *   endDate     – ISO date string, inclusive upper bound on created_at
 *   search      – free-text search across event, user_email, target_type, reason_text
 */
export async function GET(request) {
  try {
    initializeDatabase();

    // Admin-only: access_rank >= 100
    const auth = requireAccess(request, db, { minAccessRank: 100, requireCsrf: false });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const action = searchParams.get('action') || '';
    const entity = searchParams.get('entity') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const search = searchParams.get('search') || '';

    // Build WHERE clauses dynamically
    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('event LIKE ?');
      params.push(`%.${action}`);
    }

    if (entity) {
      conditions.push('target_type = ?');
      params.push(entity);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      // If only a date (no time), include the full day
      params.push(endDate.length === 10 ? `${endDate} 23:59:59` : endDate);
    }

    if (search) {
      conditions.push(
        '(event LIKE ? OR user_email LIKE ? OR target_type LIKE ? OR reason_text LIKE ?)'
      );
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM audit_log ${whereClause}`
    ).get(...params);
    const total = countRow?.total || 0;

    // Fetch page
    const rows = db.prepare(
      `SELECT audit_id, event, user_email, target_type, target_id, reason_type, reason_text, payload, created_at
       FROM audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return NextResponse.json({
      entries: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log', details: error.message },
      { status: 500 }
    );
  }
}
