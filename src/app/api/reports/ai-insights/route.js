import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requirePermission } from '@/lib/auth/server-auth';
import { generateReportInsights } from '@/lib/openai-report-insights';

function safeParseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadReport(db, reportId) {
  const row = db.prepare(
    'SELECT id, initiative_id, report_data FROM reports WHERE id = ?'
  ).get(Number(reportId));
  if (!row) return null;

  const snapshot = safeParseJson(row.report_data, null);
  return { row, snapshot };
}

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'reports.create', { requireCsrf: false });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    if (!reportId || isNaN(Number(reportId)) || Number(reportId) < 1) {
      return NextResponse.json({ error: 'Valid reportId is required' }, { status: 400 });
    }

    const loaded = loadReport(db, reportId);
    if (!loaded) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const aiInsights = loaded.snapshot?.results?.aiInsights || null;
    return NextResponse.json({ insights: aiInsights, cached: aiInsights !== null });
  } catch (error) {
    console.error('Error checking AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to check AI insights', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requirePermission(request, db, 'reports.create');
    if (auth.error) return auth.error;

    const body = await request.json();
    const reportId = body.reportId;
    const regenerate = body.regenerate === true;

    if (!reportId || isNaN(Number(reportId)) || Number(reportId) < 1) {
      return NextResponse.json({ error: 'Valid reportId is required' }, { status: 400 });
    }

    const loaded = loadReport(db, reportId);
    if (!loaded) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { row, snapshot } = loaded;

    // Return cached insights unless regenerate is requested
    const existing = snapshot?.results?.aiInsights;
    if (existing && existing.aiGenerated && !regenerate) {
      return NextResponse.json({ success: true, insights: existing, cached: true });
    }

    // Extract data for the LLM
    const results = snapshot?.results || {};
    const config = snapshot?.config || {};
    const sampleTableData = Array.isArray(results.filteredTableData)
      ? results.filteredTableData.slice(0, 50)
      : [];

    const insights = await generateReportInsights({
      initiativeName: results.initiativeName || config.initiativeName || 'Unknown',
      summary: results.summary || {},
      metrics: results.metrics || {},
      chartData: results.chartData || {},
      trendData: results.trendData || [],
      sampleTableData,
    });

    if (!insights.aiGenerated) {
      const code = insights.error?.includes('not configured') ? 'AI_NOT_CONFIGURED' : 'AI_UNAVAILABLE';
      return NextResponse.json({ success: false, code, error: insights.error });
    }

    // Cache insights in the snapshot
    if (snapshot && snapshot.results) {
      snapshot.results.aiInsights = insights;
      db.prepare('UPDATE reports SET report_data = ? WHERE id = ?').run(
        JSON.stringify(snapshot),
        Number(row.id)
      );
    }

    return NextResponse.json({ success: true, insights, cached: false });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI insights', details: error.message },
      { status: 500 }
    );
  }
}
