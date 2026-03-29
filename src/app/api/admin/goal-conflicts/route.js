import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { requireAccess } from '@/lib/auth/server-auth';
import { logAudit } from '@/lib/audit';
import { performGoalUpdate } from '@/lib/goals/perform-goal-update';

function parseJson(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/** GET — list conflicts; ?pendingCount=1 returns only { pendingCount } for nav badge */
export async function GET(request) {
  try {
    initializeDatabase();
    const auth = requireAccess(request, db, { minAccessRank: 100, requireCsrf: false });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    if (searchParams.get('pendingCount') === '1') {
      const row = db
        .prepare(`SELECT COUNT(*) as c FROM goal_edit_conflict WHERE status = 'pending'`)
        .get();
      return NextResponse.json({ pendingCount: row.c });
    }

    const status = searchParams.get('status') || 'pending';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const rows =
      status === 'all'
        ? db
            .prepare(
              `
      SELECT c.*, i.initiative_name
      FROM goal_edit_conflict c
      JOIN initiative i ON i.initiative_id = c.initiative_id
      ORDER BY c.created_at DESC
      LIMIT ?
    `
            )
            .all(limit)
        : db
            .prepare(
              `
      SELECT c.*, i.initiative_name
      FROM goal_edit_conflict c
      JOIN initiative i ON i.initiative_id = c.initiative_id
      WHERE c.status = ?
      ORDER BY c.created_at DESC
      LIMIT ?
    `
            )
            .all(status, limit);

    const enriched = rows.map((r) => ({
      ...r,
      proposed_patch: parseJson(r.proposed_patch, {}),
      server_snapshot: parseJson(r.server_snapshot, {}),
    }));

    return NextResponse.json({ conflicts: enriched });
  } catch (error) {
    console.error('/api/admin/goal-conflicts GET error:', error);
    return NextResponse.json({ error: 'Failed to load conflicts' }, { status: 500 });
  }
}

/** PATCH — resolve: apply proposed edits or reject */
export async function PATCH(request) {
  try {
    initializeDatabase();
    const auth = requireAccess(request, db, { minAccessRank: 100 });
    if (auth.error) return auth.error;

    const body = await request.json();
    const conflictId = body.conflict_id;
    const action = body.action;

    if (!conflictId || !['apply', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'conflict_id and action ("apply" | "reject") are required' },
        { status: 400 }
      );
    }

    const row = db
      .prepare(`SELECT * FROM goal_edit_conflict WHERE conflict_id = ?`)
      .get(Number(conflictId));
    if (!row) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Conflict already resolved' }, { status: 409 });
    }

    const proposedPatch = parseJson(row.proposed_patch, null);
    if (!proposedPatch || typeof proposedPatch !== 'object') {
      return NextResponse.json({ error: 'Invalid stored conflict payload' }, { status: 500 });
    }

    if (action === 'reject') {
      db.prepare(
        `
        UPDATE goal_edit_conflict
        SET status = 'resolved', resolution = 'rejected_proposal',
            resolved_by_email = ?, resolved_at = datetime('now')
        WHERE conflict_id = ?
      `
      ).run(auth.user.email, Number(conflictId));

      logAudit(db, {
        event: 'goal.conflict_resolved',
        userEmail: auth.user.email,
        targetType: 'goal_conflict',
        targetId: String(conflictId),
        payload: {
          goal_id: row.goal_id,
          resolution: 'rejected_proposal',
          submitter_email: row.submitter_email,
        },
      });

      return NextResponse.json({ success: true, resolution: 'rejected_proposal' });
    }

    const existing = db.prepare('SELECT * FROM initiative_goal WHERE goal_id = ?').get(row.goal_id);
    if (!existing) {
      db.prepare(
        `
        UPDATE goal_edit_conflict
        SET status = 'resolved', resolution = 'rejected_proposal',
            resolved_by_email = ?, resolved_at = datetime('now')
        WHERE conflict_id = ?
      `
      ).run(auth.user.email, Number(conflictId));
      return NextResponse.json(
        { error: 'Goal no longer exists; conflict closed without applying changes.' },
        { status: 410 }
      );
    }

    const updateResult = performGoalUpdate(db, existing, proposedPatch, { userEmail: auth.user.email });
    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error }, { status: 400 });
    }

    db.prepare(
      `
      UPDATE goal_edit_conflict
      SET status = 'resolved', resolution = 'applied_proposal',
          resolved_by_email = ?, resolved_at = datetime('now')
      WHERE conflict_id = ?
    `
    ).run(auth.user.email, Number(conflictId));

    logAudit(db, {
      event: 'goal.conflict_resolved',
      userEmail: auth.user.email,
      targetType: 'goal_conflict',
      targetId: String(conflictId),
      payload: {
        goal_id: row.goal_id,
        resolution: 'applied_proposal',
        submitter_email: row.submitter_email,
        applied_fields: Object.keys(proposedPatch),
      },
    });

    return NextResponse.json({
      success: true,
      resolution: 'applied_proposal',
      goal_id: row.goal_id,
    });
  } catch (error) {
    console.error('/api/admin/goal-conflicts PATCH error:', error);
    return NextResponse.json({ error: 'Failed to resolve conflict' }, { status: 500 });
  }
}
