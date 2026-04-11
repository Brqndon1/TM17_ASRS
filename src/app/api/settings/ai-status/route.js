import db from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/settings/ai-status — public, returns whether AI reports are available
export async function GET() {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'openai_api_key'").get();
    const configured = !!(row?.value) || !!process.env.OPENAI_API_KEY;
    return NextResponse.json({ ai_configured: configured });
  } catch {
    return NextResponse.json({ ai_configured: false });
  }
}
