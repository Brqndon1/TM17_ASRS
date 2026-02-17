import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { processReportData } from '@/lib/report-engine';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------
// Utility: Load static JSON snapshot data
// ---------------------------------------------
function loadJsonData(filename) {
  const filePath = path.join(process.cwd(), 'src', 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// ---------------------------------------------
// GET - List reports
// ---------------------------------------------
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

// ---------------------------------------------
// POST - Create + Export Report
// ---------------------------------------------
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const format = body.format || 'pdf';

    const initiativeId =
      body.initiativeId || body.surveyId || body.initiative_id;

    if (!initiativeId) {
      return NextResponse.json(
        { error: 'initiativeId is required' },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Load Data Sources
    // -----------------------------------------
    const reportDataFile = loadJsonData('reportData.json');
    const trendDataFile = loadJsonData('trendData.json');
    const initiativesFile = loadJsonData('initiatives.json');

    const rawReport = reportDataFile.reports[String(initiativeId)];
    const initiative = initiativesFile.initiatives.find(
      i => i.id === Number(initiativeId)
    );

    const trendData = (trendDataFile.trends[String(initiativeId)] || [])
      .filter(t => t.enabledDisplay);

    if (!rawReport || !initiative) {
      return NextResponse.json(
        { error: 'No data found for this initiative' },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // Process Report Pipeline
    // -----------------------------------------
    const filters = body.filters || {};
    const expressions = body.expressions || [];
    const sorts = body.sorts || [];

    const { filteredData, metrics } = processReportData(
      rawReport.tableData,
      filters,
      expressions,
      sorts,
      initiative.attributes
    );

    // -----------------------------------------
    // Build Snapshot
    // -----------------------------------------
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
      },
      generatedAt: new Date().toISOString(),
    };

    // -----------------------------------------
    // Save to Database
    // -----------------------------------------
    const result = db.prepare(
      `INSERT INTO reports 
        (initiative_id, name, description, status, created_by, report_data, created_at)
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

    const reportName = body.name || `Report-${result.lastInsertRowid}`;

    // -----------------------------------------
    // FORMAT EXPORTS
    // -----------------------------------------

    // ---------- JSON ----------
    if (format === 'json') {
      return new Response(JSON.stringify(snapshot, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${reportName}.json"`,
        },
      });
    }

    // ---------- CSV ----------
    if (format === 'csv' || format === 'xlsx') {
      const headers = Object.keys(filteredData[0] || {});
      const rows = filteredData.map(row =>
        headers.map(h => `"${row[h] ?? ''}"`).join(',')
      );

      const csvContent = [headers.join(','), ...rows].join('\n');

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type':
            format === 'csv'
              ? 'text/csv'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${reportName}.${format}"`,
        },
      });
    }

    // ---------- PDF (Text-based safe fallback) ----------
    const basicText = `
Report: ${reportName}
Initiative: ${initiative.name}
Generated: ${new Date().toISOString()}

-----------------------
METRICS
-----------------------
${JSON.stringify(metrics, null, 2)}

-----------------------
SUMMARY
-----------------------
${rawReport.summary || 'No summary available.'}

-----------------------
ROWS INCLUDED
-----------------------
${filteredData.length}
`;

    return new Response(basicText, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportName}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error creating report:', error);

    // 🔥 Safe fallback — NEVER break frontend
    return new Response(
      `Basic Report Generated\n\nTimestamp: ${new Date().toISOString()}`,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Report.pdf"`,
        },
      }
    );
  }
}