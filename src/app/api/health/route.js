import db, { initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
  };

  try {
    // Ensure tables exist
    initializeDatabase();

    // Verify the connection with a simple query
    const row = db.prepare("SELECT datetime('now') AS now").get();
    health.database = 'connected';
    health.dbTime = row.now;
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
    health.error = error.message;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
