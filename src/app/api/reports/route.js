import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { processReportData } from '@/lib/report-engine';
import { queryTableData } from '@/lib/query-helpers';
import fs from 'fs';
import path from 'path';

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

// POST - Create a report with full config and snapshot generation
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

    // Load data from database
    const initiative = db.prepare(
      'SELECT initiative_id, initiative_name, description, attributes, summary_json, chart_data_json FROM initiative WHERE initiative_id = ?'
    ).get(Number(initiativeId));

    if (!initiative) {
      return NextResponse.json(
        { error: 'No data found for this initiative' },
        { status: 404 }
      );
    }

    const tableData = queryTableData(db, Number(initiativeId));
    const summary = initiative.summary_json ? JSON.parse(initiative.summary_json) : {};
    const chartData = initiative.chart_data_json ? JSON.parse(initiative.chart_data_json) : {};
    const attributes = initiative.attributes ? JSON.parse(initiative.attributes) : [];

    // Trends are computed analytics — read from JSON file
    const trendFilePath = path.join(process.cwd(), 'src', 'data', 'trendData.json');
    let trendData = [];
    try {
      const trendDataFile = JSON.parse(fs.readFileSync(trendFilePath, 'utf-8'));
      trendData = (trendDataFile.trends[String(initiativeId)] || []).filter(t => t.enabledDisplay);
    } catch { /* no trend data available */ }

    const rawReport = { tableData, summary, chartData };

    // Extract report config from request body
    const filters = body.filters || {};
    const expressions = body.expressions || [];
    const sorts = body.sorts || [];

    // Run the full pipeline
    const { filteredData, metrics } = processReportData(
      tableData,
      filters,
      expressions,
      sorts,
      attributes
    );

    // Build the versioned snapshot
    const snapshot = {
      version: 1,
      config: {
        initiativeId,
        initiativeName: initiative.initiative_name,
        filters,
        expressions,
        sorts,
      },
      results: {
        metrics,
        filteredTableData: filteredData,
        chartData,
        trendData,
        summary,
        reportId: `RPT-db-${initiativeId}`,
        initiativeName: initiative.initiative_name,
        generatedDate: new Date().toISOString().slice(0, 10),
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
