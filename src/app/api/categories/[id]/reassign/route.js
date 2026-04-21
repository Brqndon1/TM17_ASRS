import { db, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-auth';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/categories/[id]/reassign
 * Body: { reassign_to_category_id: number }
 * Moves all initiative-category links from :id to the specified category, avoiding duplicates,
 * then deletes the original category.
 */
export async function POST(request, { params }) {
  try {
    initializeDatabase();
    const auth = requirePermission(request, db, 'initiatives.manage');
    if (auth.error) return auth.error;

    const { id } = await params;
    const fromId = Number(id);
    const body = await request.json();
    const toId = Number(body.reassign_to_category_id);

    if (!toId || Number.isNaN(toId) || toId === fromId) {
      return NextResponse.json({ error: 'Invalid reassign_to_category_id' }, { status: 400 });
    }

    // Verify both categories exist
    const fromCat = db.prepare('SELECT * FROM category WHERE category_id = ?').get(fromId);
    const toCat = db.prepare('SELECT * FROM category WHERE category_id = ?').get(toId);

    if (!fromCat) return NextResponse.json({ error: 'Source category not found' }, { status: 404 });
    if (!toCat) return NextResponse.json({ error: 'Target category not found' }, { status: 404 });

    // Fetch initiatives linked to source
    const rels = db.prepare('SELECT initiative_id FROM initiative_category WHERE category_id = ?').all(fromId);
    let reassigned = 0;

    const insertStmt = db.prepare('INSERT OR IGNORE INTO initiative_category (initiative_id, category_id) VALUES (?, ?)');
    const deleteStmt = db.prepare('DELETE FROM initiative_category WHERE initiative_id = ? AND category_id = ?');

    // Reassign each initiative to target (avoiding duplicates)
    for (const r of rels) {
      const initiativeId = r.initiative_id;
      insertStmt.run(initiativeId, toId);
      // Check if insertion actually created a row: use changes from insertStmt? better to attempt delete later
      reassigned++;
    }

    // Remove all links to source category
    db.prepare('DELETE FROM initiative_category WHERE category_id = ?').run(fromId);

    // Delete the source category
    db.prepare('DELETE FROM category WHERE category_id = ?').run(fromId);

    // Audit log
    try {
      logAudit(db, {
        event: 'category.reassigned',
        userEmail: auth.user.email,
        targetType: 'category',
        targetId: String(fromId),
        payload: { reassigned_count: reassigned, to: toId },
      });

      logAudit(db, {
        event: 'category.deleted',
        userEmail: auth.user.email,
        targetType: 'category',
        targetId: String(fromId),
        payload: { deleted_name: fromCat.category_name },
      });
    } catch (err) {
      console.error('Audit log failed for category.reassign/delete', err?.message || err);
    }

    return NextResponse.json({ success: true, message: `Reassigned ${reassigned} initiatives and deleted category` });
  } catch (error) {
    console.error('Error reassigning category:', error);
    return NextResponse.json({ error: 'Failed to reassign and delete category', details: error.message }, { status: 500 });
  }
}
