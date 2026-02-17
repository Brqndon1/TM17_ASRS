import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { processReportData } from '@/lib/report-engine';
import fs from 'fs';
import path from 'path';

// Load static JSON data for snapshot generation
function loadJsonData(filename) {
  const filePath = path.join(process.cwd(), 'src', 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// GET - List reports (optionally filtered by initiativeId)
export async function GET(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const initiativeId = searchParams.get('initiativeId');

    let rows;
    if (initiativeId) {
      rows = db.prepare(
        `SELECT r.*, i.initiative_name
         FROM reports r
         LEFT JOIN initiative i ON r.initiative_id = i.initiative_id
         WHERE r.initiative_id = ?
         ORDER BY r.created_at DESC`
      ).all(Number(initiativeId));
    } else {
      rows = db.prepare(
        `SELECT r.*, i.initiative_name
         FROM reports r
         LEFT JOIN initiative i ON r.initiative_id = i.initiative_id
         ORDER BY r.created_at DESC`
      ).all();
    }

    return NextResponse.json({ reports: rows });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a report with full wizard config and snapshot generation
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();

    const initiativeId =
      body.initiativeId || body.surveyId || body.initiative_id;

    if (!initiativeId) {
      return NextResponse.json(
        { error: 'initiativeId is required' },
        { status: 400 }
      );
    }

    // Load data sources
    const reportDataFile = loadJsonData('reportData.json');
    const trendDataFile = loadJsonData('trendData.json');
    const initiativesFile = loadJsonData('initiatives.json');

    const rawReport = reportDataFile.reports[String(initiativeId)];
    const initiative = initiativesFile.initiatives.find(i => i.id === Number(initiativeId));
    const trendData = (trendDataFile.trends[String(initiativeId)] || [])
      .filter(t => t.enabledDisplay);

    if (!rawReport || !initiative) {
      return NextResponse.json(
        { error: 'No data found for this initiative' },
        { status: 404 }
      );
    }

    // Extract wizard config from request body
    const filters = body.filters || {};
    const expressions = body.expressions || [];
    const sorts = body.sorts || [];

    // Run the full pipeline
    const { filteredData, metrics } = processReportData(
      rawReport.tableData,
      filters,
      expressions,
      sorts,
      initiative.attributes
    );

    // Build the versioned snapshot
    const snapshot = {
      version: 1,
      config: {
        initiativeId,
        initiativeName: initiative.name,
        filters,
        expressions,
        sorts,
      },
      results: {
        metrics,
        filteredTableData: filteredData,
        chartData: rawReport.chartData,
        trendData,
        summary: rawReport.summary,
        reportId: rawReport.reportId,
        initiativeName: rawReport.initiativeName,
        generatedDate: rawReport.generatedDate,
      },
      generatedAt: new Date().toISOString(),
    };

    const result = db.prepare(
      `INSERT INTO reports (initiative_id, name, description, status, created_by, report_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      initiativeId,
      body.name || '',
      body.description || '',
      'completed',
      body.createdBy || '',
      JSON.stringify(snapshot),
      new Date().toISOString()
    );

    return NextResponse.json({
      success: true,
      reportId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report', details: error.message },
      { status: 500 }
    );
  }
}
