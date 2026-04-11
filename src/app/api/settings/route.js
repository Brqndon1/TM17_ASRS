import db from '@/lib/db';
import { requirePermission } from '@/lib/auth/server-auth';
import { NextResponse } from 'next/server';

// GET /api/settings — admin only, returns non-sensitive settings + whether API key is configured
export async function GET(request) {
  try {
    const auth = requirePermission(request, db, 'admin.manage', { requireCsrf: false });
    if (auth.error) return auth.error;

    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'openai_api_key'").get();
    const hasKey = !!(row?.value);
    const envKey = !!process.env.OPENAI_API_KEY;

    return NextResponse.json({
      openai_configured: hasKey || envKey,
      openai_source: hasKey ? 'database' : envKey ? 'environment' : 'none',
      // Mask the key — only show last 4 chars
      openai_key_hint: hasKey ? `sk-...${row.value.slice(-4)}` : envKey ? `sk-...${process.env.OPENAI_API_KEY.slice(-4)}` : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/settings — admin only, update settings
export async function PUT(request) {
  try {
    const auth = requirePermission(request, db, 'admin.manage');
    if (auth.error) return auth.error;

    const body = await request.json();

    if (body.openai_api_key !== undefined) {
      const key = String(body.openai_api_key).trim();
      if (key) {
        db.prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES ('openai_api_key', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).run(key);
      } else {
        // Empty string = remove the key
        db.prepare("DELETE FROM app_settings WHERE key = 'openai_api_key'").run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
