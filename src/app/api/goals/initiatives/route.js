import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { requireAccess } from '@/lib/auth/server-auth';

// GET - Fetch all initiatives from the database (for the goals page dropdown)
export async function GET(request) {
  try {
    initializeDatabase();
    const auth = requireAccess(request, db, { minAccessRank: 50 });
    if (auth.error) return auth.error;  
    const initiatives = db.prepare(
      'SELECT initiative_id, initiative_name FROM initiative ORDER BY initiative_name ASC'
    ).all();

    return NextResponse.json({ initiatives });
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiatives', details: error.message },
      { status: 500 }
    );
  }
}
