import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import EVENTS from '@/lib/events/event-types';
import { hashPassword } from '@/lib/auth/passwords';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();

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

export async function POST(request) {
  try {
    const { db, eventBus, clock } = getServiceContainer();
    const { token, password } = await request.json();
    const normalizedPassword = String(password || '');

    if (!token || !normalizedPassword.trim()) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (normalizedPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
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

    db.prepare(`
      UPDATE user
      SET verified = 1,
          password = ?,
          verification_token = NULL,
          token_expires_at = NULL
      WHERE user_id = ?
    `).run(hashPassword(normalizedPassword), user.user_id);

    eventBus.publish(EVENTS.USER_VERIFIED, {
      userId: Number(user.user_id),
      email: user.email,
      verifiedAt: clock.nowIso(),
    });

    return NextResponse.json({
      success: true,
      message: 'Account verified. You can now log in.',
    });
  } catch (error) {
    console.error('Verify POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
