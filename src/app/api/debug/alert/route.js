import { NextResponse } from 'next/server';
import { alertDb } from '@/lib/db-alerts';
import db from '@/lib/db';
import { requireAccess } from '@/lib/auth/server-auth';

export async function POST(request) {
  try {
    const auth = requireAccess(request, db, { minAccessRank: 100 });
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const err = new Error(body.message || 'debug alert');
    // Fire-and-forget alert; return OK immediately
    alertDb(err, { route: '/api/debug/alert', payload: body }).catch(() => void 0);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in debug alert endpoint:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
