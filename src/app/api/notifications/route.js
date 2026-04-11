import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAuth(request, db, { requireCsrf: false });
    if (auth.error) return auth.error;

    const surveys = db.prepare(
      'SELECT id, name, email, submitted_at FROM surveys ORDER BY submitted_at DESC LIMIT 20'
    ).all();

    const reports = db.prepare(
      'SELECT id, name, status, created_at FROM reports ORDER BY created_at DESC LIMIT 20'
    ).all();

    const initiatives = db.prepare(
      'SELECT initiative_id, initiative_name FROM initiative ORDER BY initiative_id DESC LIMIT 20'
    ).all();

    const notifications = [
      ...surveys.map(s => ({
        id: `survey-${s.id}`,
        type: 'survey',
        title: 'New Survey Submission',
        description: `${s.name || s.email} submitted a survey`,
        timestamp: s.submitted_at,
      })),
      ...reports.map(r => ({
        id: `report-${r.id}`,
        type: 'report',
        title: 'Report Created',
        description: `${r.name || 'Untitled report'} — ${r.status}`,
        timestamp: r.created_at,
      })),
      ...initiatives.map(i => ({
        id: `initiative-${i.initiative_id}`,
        type: 'initiative',
        title: 'Initiative Created',
        description: i.initiative_name,
        timestamp: null,
      })),
    ];

    notifications.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return NextResponse.json({ notifications: notifications.slice(0, 50) });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
