import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { toReportDetailDto } from '@/lib/adapters/report-adapter';

export async function GET(_request, { params }) {
  try {
    const { db } = getServiceContainer();
    const { id } = await params;

    const row = db.prepare(
      `SELECT r.*, i.initiative_name
       FROM reports r
       LEFT JOIN initiative i ON r.initiative_id = i.initiative_id
       WHERE r.id = ?`
    ).get(Number(id));

    if (!row) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report: toReportDetailDto(row) });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report', details: error.message },
      { status: 500 }
    );
  }
}
