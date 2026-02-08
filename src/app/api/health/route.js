import pool, { initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
  };

  try {
    // Ensure tables exist
    await initializeDatabase();

    // Verify the connection with a simple query
    const result = await pool.query('SELECT NOW() AS now');
    health.database = 'connected';
    health.dbTime = result.rows[0].now;
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
    health.error = error.message;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
