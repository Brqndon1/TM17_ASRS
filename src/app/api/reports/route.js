// POST - Create a report (used by Report Creation tab)
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

    const reportData = {
      ...body,
      generatedAt: new Date().toISOString(),
    };

    const result = db.prepare(
      `INSERT INTO reports (initiative_id, report_data, created_at)
       VALUES (?, ?, ?)`
    ).run(
      initiativeId,
      JSON.stringify(reportData),
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