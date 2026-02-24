import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { computeTrendData, processReportData, validateTrendConfig } from '@/lib/report-engine';
import { queryTableData } from '@/lib/query-helpers';
import {
  validateReportCreatePayload,
  validateReportDeleteParams,
  validateReportQueryParams,
  validateReportUpdatePayload,
} from '@/lib/report-validation';

function startGenerationLog(payload) {
  return db.prepare(`
    INSERT INTO report_generation_log (
      initiative_id,
      status,
      input_rows,
      output_rows,
      filters_count,
      expressions_count,
      sorts_count,
      trend_variables_count
    ) VALUES (?, 'started', ?, 0, ?, ?, ?, ?)
  `).run(
    payload.initiativeId,
    payload.inputRows,
    payload.filtersCount,
    payload.expressionsCount,
    payload.sortsCount,
    payload.trendVariablesCount
  ).lastInsertRowid;
}

function finishGenerationLog(logId, result) {
  db.prepare(`
    UPDATE report_generation_log
    SET status = ?,
        report_id = ?,
        duration_ms = ?,
        output_rows = ?,
        error_message = ?
    WHERE log_id = ?
  `).run(
    result.status,
    result.reportId || null,
    result.durationMs || 0,
    result.outputRows || 0,
    result.errorMessage || null,
    Number(logId)
  );
}

// GET - List reports (optionally filtered by initiativeId)
export async function GET(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const queryValidation = validateReportQueryParams(searchParams);
    if (!queryValidation.valid) {
      return NextResponse.json({ error: queryValidation.error }, { status: 400 });
    }
    const { initiativeId } = queryValidation;

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
  let generationLogId = null;
  const startedAt = Date.now();
  try {
    initializeDatabase();

    const body = await request.json();
    const payloadValidation = validateReportCreatePayload(body);
    if (!payloadValidation.valid) {
      return NextResponse.json({ error: payloadValidation.error }, { status: 400 });
    }
    const payload = payloadValidation.value;

    const initiativeId = payload.initiativeId;

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
    const filters = payload.filters || {};
    const expressions = payload.expressions || [];
    const sorts = payload.sorts || [];
    const incomingTrendConfig = payload.trendConfig === undefined
      ? { variables: [], enabledCalc: false, enabledDisplay: true }
      : payload.trendConfig;
    const trendConfigValidation = validateTrendConfig(incomingTrendConfig, attributes);
    if (!trendConfigValidation.valid) {
      return NextResponse.json({ error: trendConfigValidation.error }, { status: 400 });
    }
    const trendConfig = trendConfigValidation.normalized;
    generationLogId = startGenerationLog({
      initiativeId: Number(initiativeId),
      inputRows: tableData.length,
      filtersCount: Object.keys(filters).length,
      expressionsCount: expressions.length,
      sortsCount: sorts.length,
      trendVariablesCount: trendConfig.variables.length,
    });

    // Run the full pipeline
    const { filteredData, metrics, explainability } = processReportData(
      tableData,
      filters,
      expressions,
      sorts,
      attributes
    );
    const trendData = computeTrendData(filteredData, trendConfig, {
      initiativeId: Number(initiativeId),
      reportName: payload.name || '',
    });

    // Build the versioned snapshot
    const snapshot = {
      version: 2,
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
        explainability,
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
      payload.name || '',
      payload.description || '',
      'completed',
      payload.createdBy || '',
      JSON.stringify(snapshot),
      new Date().toISOString()
    );
    if (generationLogId) {
      finishGenerationLog(generationLogId, {
        status: 'completed',
        reportId: Number(result.lastInsertRowid),
        durationMs: Date.now() - startedAt,
        outputRows: filteredData.length,
      });
    }

    return NextResponse.json({
      success: true,
      reportId: result.lastInsertRowid,
    });
  } catch (error) {
    if (generationLogId) {
      finishGenerationLog(generationLogId, {
        status: 'failed',
        durationMs: Date.now() - startedAt,
        outputRows: 0,
        errorMessage: error.message,
      });
    }
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
    const payloadValidation = validateReportUpdatePayload(body);
    if (!payloadValidation.valid) {
      return NextResponse.json({ error: payloadValidation.error }, { status: 400 });
    }
    const { id, name, description, status } = payloadValidation.value;

    const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
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
    const deleteValidation = validateReportDeleteParams(searchParams);
    if (!deleteValidation.valid) {
      return NextResponse.json({ error: deleteValidation.error }, { status: 400 });
    }
    const { id } = deleteValidation;

    const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM reports WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report', details: error.message },
      { status: 500 }
    );
  }
}
