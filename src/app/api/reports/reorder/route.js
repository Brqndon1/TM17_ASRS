import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

// PUT - Bulk-update display_order for reports
// Body: { order: [{ id: 1, display_order: 0 }, { id: 5, display_order: 1 }, ...] }
export async function PUT(request) {
  try {
    initializeDatabase();
    const { order } = await request.json();

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json(
        { error: 'order array is required' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('UPDATE reports SET display_order = ? WHERE id = ?');
    const updateAll = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.display_order, item.id);
      }
    });
    updateAll(order);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering reports:', error);
    return NextResponse.json(
      { error: 'Failed to reorder reports', details: error.message },
      { status: 500 }
    );
  }
}
