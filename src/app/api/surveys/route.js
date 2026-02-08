import db, { initializeDatabase } from '@/lib/db';
import { generateAIReport } from '@/lib/openai';
import { NextResponse } from 'next/server';

// POST - Submit a survey
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const { name, email, responses } = body;

    // Validate required fields
    if (!name || !email || !responses) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, responses' },
        { status: 400 }
      );
    }

    // Generate basic statistics
    const basicStats = generateBasicStats(responses);

    // Generate AI-enhanced report using GPT-4
    const reportData = await generateAIReport(responses, basicStats);

    // Use a transaction so survey + report are atomic
    const insertSurveyAndReport = db.transaction((name, email, responsesJSON, reportJSON) => {
      const surveyInfo = db.prepare(
        `INSERT INTO surveys (name, email, responses) VALUES (?, ?, ?)`
      ).run(name, email, responsesJSON);

      const surveyId = surveyInfo.lastInsertRowid;

      db.prepare(
        `INSERT INTO reports (survey_id, report_data) VALUES (?, ?)`
      ).run(surveyId, reportJSON);

      return surveyId;
    });

    const surveyId = insertSurveyAndReport(
      name,
      email,
      JSON.stringify(responses),
      JSON.stringify(reportData)
    );

    return NextResponse.json({
      success: true,
      surveyId: Number(surveyId),
      report: reportData,
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    return NextResponse.json(
      { error: 'Failed to submit survey', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch all surveys and reports
export async function GET() {
  try {
    initializeDatabase();

    const rows = db.prepare(`
      SELECT
        s.id,
        s.name,
        s.email,
        s.responses,
        s.submitted_at,
        r.report_data,
        r.created_at AS report_created_at
      FROM surveys s
      LEFT JOIN reports r ON s.id = r.survey_id
      ORDER BY s.submitted_at DESC
    `).all();

    const formattedSurveys = rows.map((survey) => ({
      id: survey.id,
      name: survey.name,
      email: survey.email,
      responses: JSON.parse(survey.responses),
      submittedAt: survey.submitted_at,
      report: survey.report_data ? JSON.parse(survey.report_data) : null,
      reportCreatedAt: survey.report_created_at,
    }));

    return NextResponse.json({ surveys: formattedSurveys });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys', details: error.message },
      { status: 500 }
    );
  }
}

// --------------- helpers ---------------

function generateBasicStats(responses) {
  const totalQuestions = Object.keys(responses).length;
  const answeredQuestions = Object.values(responses).filter(
    (r) => r !== null && r !== ''
  ).length;

  const completionRate =
    totalQuestions > 0
      ? parseFloat(((answeredQuestions / totalQuestions) * 100).toFixed(2))
      : 0;

  const responseTypes = { text: 0, numeric: 0, choice: 0 };

  Object.values(responses).forEach((response) => {
    if (typeof response === 'number') {
      responseTypes.numeric++;
    } else if (typeof response === 'string') {
      if (
        ['yes', 'no', 'maybe', 'true', 'false'].includes(
          response.toLowerCase()
        )
      ) {
        responseTypes.choice++;
      } else {
        responseTypes.text++;
      }
    }
  });

  return { completionRate, totalQuestions, answeredQuestions, responseTypes };
}
