import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';

export async function GET() {
  try {
    const { db } = getServiceContainer();

    const rows = db.prepare(`
      SELECT DISTINCT i.initiative_id, i.initiative_name, i.description,
             i.attributes, i.created_at, i.updated_at, i.status
      FROM initiative i
      INNER JOIN reports r ON r.initiative_id = i.initiative_id
        AND LOWER(r.status) = 'published'
    `).all();

    const initiatives = rows.map((row) => ({
      id: Number(row.initiative_id),
      name: row.initiative_name || '',
      description: row.description || '',
      attributes: (() => {
        try { return JSON.parse(row.attributes || '[]'); } catch { return []; }
      })(),
      status: row.status || 'active',
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    }));

    return NextResponse.json({ initiatives });
  } catch (error) {
    console.error('Error fetching public initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiatives' },
      { status: 500 }
    );
  }
}
