import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { db } = getServiceContainer();

    const rows = db.prepare(
      'SELECT * FROM trend WHERE initiative_id = ? AND enabled_display = 1'
    ).all(Number(id));

    const trends = rows.map(row => ({
      trendId: row.trend_key,
      reportId: row.report_id,
      attributes: JSON.parse(row.attributes),
      direction: row.direction,
      magnitude: row.magnitude,
      timePeriod: row.time_period,
      enabledDisplay: !!row.enabled_display,
      enabledCalc: !!row.enabled_calc,
      description: row.description,
    }));

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching trend data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend data', details: error.message },
      { status: 500 }
    );
  }
}
