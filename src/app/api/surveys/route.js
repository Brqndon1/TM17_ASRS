import pool, { initializeDatabase } from '@/lib/db';
import { generateAIReport } from '@/lib/openai';
import { NextResponse } from 'next/server';

// POST - Submit a survey
export async function POST(request) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const { name, email, responses } = body;

    // Validate required fields
    if (!name || !email || !responses) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, responses' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Begin transaction so survey + report are atomic
      await client.query('BEGIN');

      // Insert survey into database
      const surveyResult = await client.query(
        `INSERT INTO surveys (name, email, responses)
         VALUES ($1, $2, $3)
         RETURNING id, submitted_at`,
        [name, email, JSON.stringify(responses)]
      );

      const surveyId = surveyResult.rows[0].id;

      // Generate basic statistics
      const basicStats = generateBasicStats(responses);

      // Generate AI-enhanced report using GPT-4
      const reportData = await generateAIReport(responses, basicStats);

      // Insert report into database
      await client.query(
        `INSERT INTO reports (survey_id, report_data)
         VALUES ($1, $2)`,
        [surveyId, JSON.stringify(reportData)]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        surveyId,
        report: reportData,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
    await initializeDatabase();

    const result = await pool.query(`
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
    `);

    const formattedSurveys = result.rows.map((survey) => ({
      id: survey.id,
      name: survey.name,
      email: survey.email,
      responses: survey.responses,
      submittedAt: survey.submitted_at,
      report: survey.report_data || null,
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
