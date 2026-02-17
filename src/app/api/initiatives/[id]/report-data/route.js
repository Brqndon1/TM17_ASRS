import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { queryTableData } from '@/lib/query-helpers';

export async function GET(request, { params }) {
  try {
    initializeDatabase();

    const { id } = await params;
    const initiativeId = Number(id);

    const initiative = db.prepare(
      'SELECT initiative_id, initiative_name, summary_json, chart_data_json FROM initiative WHERE initiative_id = ?'
    ).get(initiativeId);

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    const tableData = queryTableData(db, initiativeId);

    return NextResponse.json({
      reportId: `RPT-db-${initiativeId}`,
      initiativeId,
      initiativeName: initiative.initiative_name,
      generatedDate: new Date().toISOString().slice(0, 10),
      summary: initiative.summary_json ? JSON.parse(initiative.summary_json) : {},
      chartData: initiative.chart_data_json ? JSON.parse(initiative.chart_data_json) : {},
      tableData,
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data', details: error.message },
      { status: 500 }
    );
  }
}
