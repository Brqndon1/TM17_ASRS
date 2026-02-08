import db, { initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch all reports (or a single report by ?surveyId=)
export async function GET(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');

    if (surveyId) {
      // ---------- Single report ----------
      const row = db.prepare(
        `SELECT r.id, r.survey_id, r.report_data, r.created_at,
                s.name, s.email
         FROM reports r
         JOIN surveys s ON r.survey_id = s.id
         WHERE r.survey_id = ?`
      ).get(surveyId);

      if (!row) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      return NextResponse.json({
        report: {
          id: row.id,
          surveyId: row.survey_id,
          surveyName: row.name,
          surveyEmail: row.email,
          reportData: JSON.parse(row.report_data),
          createdAt: row.created_at,
        },
      });
    }

    // ---------- All reports ----------
    const rows = db.prepare(`
      SELECT r.id, r.survey_id, r.report_data, r.created_at,
             s.name, s.email
      FROM reports r
      JOIN surveys s ON r.survey_id = s.id
      ORDER BY r.created_at DESC
    `).all();

    const formattedReports = rows.map((row) => ({
      id: row.id,
      surveyId: row.survey_id,
      surveyName: row.name,
      surveyEmail: row.email,
      reportData: JSON.parse(row.report_data),
      createdAt: row.created_at,
    }));

    return NextResponse.json({ reports: formattedReports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error.message },
      { status: 500 }
    );
  }
}
