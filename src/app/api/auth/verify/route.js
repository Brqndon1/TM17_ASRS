/**
 * ============================================================================
 * VERIFY API — src/app/api/auth/verify/route.js
 * ============================================================================
 * Two endpoints:
 *
 *   GET  /api/auth/verify?token=xxx
 *     → Validates the token exists and hasn't expired.
 *     → Returns the user's first name so the frontend can greet them.
 *
 *   POST /api/auth/verify
 *     → Body: { token, password }
 *     → Sets the user's password, marks them verified, clears the token.
 *
 * The /verify page calls GET first (to validate), then POST on form submit.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

// ── GET: Validate token ──────────────────────────────────────────────────────
export async function GET(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const user = db.prepare(`
      SELECT user_id, first_name, email, token_expires_at
      FROM user
      WHERE verification_token = ? AND verified = 0
    `).get(token);

    if (!user) {
      return NextResponse.json(
        { error: 'This verification link is invalid or has already been used.' },
        { status: 404 }
      );
    }

    // Check expiry (stored as ISO string)
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This verification link has expired. Please contact an administrator or sign up again.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      firstName: user.first_name,
      email: user.email,
    });

  } catch (error) {
    console.error('Verify GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST: Set password and verify account ────────────────────────────────────
export async function POST(request) {
  try {
    initializeDatabase();

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = db.prepare(`
      SELECT user_id, first_name, email, token_expires_at
      FROM user
      WHERE verification_token = ? AND verified = 0
    `).get(token);

    if (!user) {
      return NextResponse.json(
        { error: 'This verification link is invalid or has already been used.' },
        { status: 404 }
      );
    }

    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This verification link has expired. Please contact an administrator or sign up again.' },
        { status: 410 }
      );
    }

    // Mark verified, set password, clear token
    db.prepare(`
      UPDATE user
      SET verified = 1,
          password = ?,
          verification_token = NULL,
          token_expires_at = NULL
      WHERE user_id = ?
    `).run(password, user.user_id);

    return NextResponse.json({
      success: true,
      message: 'Account verified. You can now log in.',
    });

  } catch (error) {
    console.error('Verify POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
