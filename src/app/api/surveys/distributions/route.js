import db, { initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST - Create a new survey distribution
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const {
      survey_template_id,
      title,
      start_date,
      end_date,
      recipient_emails = [],
      created_by_user_id,
    } = body;

    // --- Validate required fields ---
    if (!survey_template_id || !title || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: survey_template_id, title, start_date, end_date' },
        { status: 400 }
      );
    }

    // --- Date validation ---
    const start = new Date(start_date + 'T00:00:00');
    const end = new Date(end_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO date strings (e.g. 2026-03-01)' },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'end_date must be after start_date' },
        { status: 400 }
      );
    }

    if (start < today) {
      return NextResponse.json(
        { error: 'start_date cannot be in the past' },
        { status: 400 }
      );
    }

    // --- Compute initial status based on dates ---
    const todayStr = today.toISOString().split('T')[0];
    let status = 'pending';
    if (start_date <= todayStr && end_date >= todayStr) {
      status = 'active';
    }

    // --- Insert the distribution record ---
    const result = db.prepare(`
      INSERT INTO survey_distribution
        (survey_template_id, title, start_date, end_date, status, recipient_emails, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      survey_template_id,
      title,
      start_date,
      end_date,
      status,
      JSON.stringify(recipient_emails),
      created_by_user_id || null
    );

    return NextResponse.json({
      success: true,
      distribution_id: Number(result.lastInsertRowid),
      status,
      message: `Distribution "${title}" created successfully`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating distribution:', error);
    return NextResponse.json(
      { error: 'Failed to create distribution', details: error.message },
      { status: 500 }
    );
  }
}

// GET - List all distributions with auto-computed status
export async function GET() {
  try {
    initializeDatabase();

    const rows = db.prepare(`
      SELECT * FROM survey_distribution ORDER BY created_at DESC
    `).all();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const distributions = rows.map((row) => {
      // Auto-compute status based on current date
      let computedStatus = row.status;

      if (row.status !== 'closed') {
        if (today > row.end_date) {
          computedStatus = 'closed';
        } else if (today >= row.start_date && today <= row.end_date) {
          computedStatus = 'active';
        } else {
          computedStatus = 'pending';
        }

        // Persist the updated status if it changed
        if (computedStatus !== row.status) {
          db.prepare(
            'UPDATE survey_distribution SET status = ? WHERE distribution_id = ?'
          ).run(computedStatus, row.distribution_id);
        }
      }

      return {
        distribution_id: row.distribution_id,
        survey_template_id: row.survey_template_id,
        title: row.title,
        start_date: row.start_date,
        end_date: row.end_date,
        status: computedStatus,
        recipient_emails: JSON.parse(row.recipient_emails),
        response_count: row.response_count,
        created_at: row.created_at,
        created_by_user_id: row.created_by_user_id,
      };
    });

    return NextResponse.json({ distributions });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distributions', details: error.message },
      { status: 500 }
    );
  }
}
