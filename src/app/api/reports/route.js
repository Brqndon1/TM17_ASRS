import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { computeTrendData, processReportData, validateTrendConfig } from '@/lib/report-engine';
import { queryTableData } from '@/lib/query-helpers';

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
         ORDER BY r.display_order ASC, r.created_at DESC`
      ).all(Number(initiativeId));
    } else {
      rows = db.prepare(
        `SELECT r.*, i.initiative_name
         FROM reports r
         LEFT JOIN initiative i ON r.initiative_id = i.initiative_id
         ORDER BY r.display_order ASC, r.created_at DESC`
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

    // Extract report config from request body
    const filters = body.filters || {};
    const expressions = body.expressions || [];
    const sorts = body.sorts || [];
    const incomingTrendConfig = body.trendConfig === undefined
      ? { variables: [], enabledCalc: false, enabledDisplay: true }
      : body.trendConfig;
    const trendConfigValidation = validateTrendConfig(incomingTrendConfig, attributes);
    if (!trendConfigValidation.valid) {
      return NextResponse.json({ error: trendConfigValidation.error }, { status: 400 });
    }
    const trendConfig = trendConfigValidation.normalized;

    // Run the full pipeline
    const { filteredData, metrics } = processReportData(
      tableData,
      filters,
      expressions,
      sorts,
      attributes
    );
    const trendData = computeTrendData(filteredData, trendConfig);

    // Build the versioned snapshot
    const snapshot = {
      version: 1,
      config: {
        initiativeId,
        initiativeName: initiative.initiative_name,
        filters,
        expressions,
        sorts,
        trendConfig,
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

// PUT - Update an existing report's metadata
export async function PUT(request) {
  try {
    initializeDatabase();
    const body = await request.json();
    const { id, name, description, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(Number(id));
    db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(
      `SELECT r.*, i.initiative_name
       FROM reports r
       LEFT JOIN initiative i ON r.initiative_id = i.initiative_id
       WHERE r.id = ?`
    ).get(Number(id));

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a report by id
export async function DELETE(request) {
  try {
    initializeDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM reports WHERE id = ?').run(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report', details: error.message },
      { status: 500 }
    );
  }
}
