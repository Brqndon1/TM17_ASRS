import db, { initializeDatabase } from '@/lib/db';
import { generateAIReport } from '@/lib/openai';
import { NextResponse } from 'next/server';
import { requireAccess } from '@/lib/auth/server-auth';
import { validateAndCleanSurvey } from '@/lib/survey-validation';
import { alertDb } from '@/lib/db-alerts';

function toLocalYyyyMmDd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// POST - Submit a survey
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const cleaned = validateAndCleanSurvey(body);

    // Generate basic statistics on cleaned responses
    const basicStats = generateBasicStats(cleaned.responses);

    // Generate AI-enhanced report using GPT-4
    const reportData = await generateAIReport(cleaned.responses, basicStats);

    // Use a transaction so survey + report are atomic
    const insertSurveyAndReport = db.transaction((name, email, responsesJSON, reportJSON, templateId) => {
      const surveyInfo = db.prepare(
        `INSERT INTO surveys (name, email, responses) VALUES (?, ?, ?)`
      ).run(name, email, responsesJSON);

      const surveyId = surveyInfo.lastInsertRowid;

      db.prepare(
        `INSERT INTO reports (survey_id, report_data) VALUES (?, ?)`
      ).run(surveyId, reportJSON);

      if (templateId) {
        const today = toLocalYyyyMmDd(new Date());
        const activeDistribution = db.prepare(`
          SELECT distribution_id
          FROM survey_distribution
          WHERE survey_template_id = ?
            AND ? >= start_date
            AND ? <= end_date
          ORDER BY created_at DESC
          LIMIT 1
        `).get(String(templateId), today, today);

        if (activeDistribution?.distribution_id) {
          db.prepare(`
            UPDATE survey_distribution
            SET response_count = response_count + 1
            WHERE distribution_id = ?
          `).run(activeDistribution.distribution_id);
        }
      }

      return surveyId;
    });

    const surveyId = insertSurveyAndReport(
      cleaned.name,
      cleaned.email,
      JSON.stringify(cleaned.responses),
      JSON.stringify(reportData),
      cleaned.templateId
    );

    return NextResponse.json({
      success: true,
      surveyId: Number(surveyId),
      report: reportData,
    });
  } catch (error) {
    const errorMessage = String(error?.message || '');
    const isValidationError = /missing|required|invalid/i.test(errorMessage);

    try {
      if (!isValidationError) {
        alertDb(error, { route: '/api/surveys POST' }).catch(() => void 0);
      }
    } catch (e) {
      // ignore
    }
    console.error('Error submitting survey:', error);
    return NextResponse.json(
      { error: isValidationError ? 'Invalid survey payload' : 'Failed to submit survey', details: errorMessage },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// GET - Fetch all surveys and reports
export async function GET(request) {
  try {
    initializeDatabase();
    // PII-sensitive endpoint: only admins can retrieve raw survey submissions.
    const auth = requireAccess(request, db, { minAccessRank: 100, requireCsrf: false });
    if (auth.error) return auth.error;

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
