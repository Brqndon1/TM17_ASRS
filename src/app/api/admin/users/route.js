import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getServiceContainer } from '@/lib/container/service-container';
import EVENTS from '@/lib/events/event-types';
import { requireAccess } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAccess(request, db, { minAccessRank: 100, requireCsrf: false });
    if (auth.error) return auth.error;

    const users = db.prepare(`
      SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        u.verified,
        ut.type as user_type,
        ut.access_rank
      FROM user u
      JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE ut.type IN ('staff', 'admin')
      ORDER BY ut.access_rank DESC, u.last_name ASC, u.first_name ASC
    `).all();

    return NextResponse.json({ success: true, users, total: users.length });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { db, mailer, clock, eventBus } = getServiceContainer();
    const auth = requireAccess(request, db, { minAccessRank: 100 });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { first_name, last_name, phone_number, email, user_type } = body;
    const normalizedFirstName = String(first_name || '').trim();
    const normalizedLastName = String(last_name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !user_type) {
      return NextResponse.json(
        { error: 'All fields are required (first_name, last_name, email, user_type)' },
        { status: 400 }
      );
    }

    if (!['staff', 'admin'].includes(user_type)) {
      return NextResponse.json(
        { error: 'user_type must be "staff" or "admin"' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const existing = db.prepare('SELECT user_id, verified FROM user WHERE email = ?').get(normalizedEmail);
    if (existing) {
      if (!existing.verified) {
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(clock.now().getTime() + 24 * 60 * 60 * 1000).toISOString();

        db.prepare('UPDATE user SET verification_token = ?, token_expires_at = ? WHERE user_id = ?')
          .run(token, expiresAt, existing.user_id);

        let emailSent = true;
        try {
          await mailer.sendAdminInviteEmail({ to: normalizedEmail, firstName: normalizedFirstName, role: user_type, token });
        } catch (error) {
          emailSent = false;
          console.error('Admin invite resend email error:', error);
        }

        eventBus.publish(EVENTS.USER_INVITED, {
          invitedBy: auth.user.email,
          email: normalizedEmail,
          role: user_type,
          userId: Number(existing.user_id),
          resent: true,
          invitedAt: clock.nowIso(),
        });

        const devVerificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}`;

        return NextResponse.json({
          success: true,
          emailSent,
          message: emailSent
            ? 'This user exists but hasn\'t verified yet. A new invite email has been sent.'
            : 'This user exists but hasn\'t verified yet. Email delivery is unavailable; use the verification link below.',
          verificationUrl: process.env.NODE_ENV === 'production' ? undefined : devVerificationUrl,
        });
      }

      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    if (phone_number && !/^\d{10}$/.test(phone_number.replace(/\D/g, ''))) {
      return NextResponse.json({ error: 'Phone number must be 10 digits' }, { status: 400 });
    }

    const typeRow = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get(user_type);
    if (!typeRow) {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(clock.now().getTime() + 24 * 60 * 60 * 1000).toISOString();

    const result = db.prepare(`
      INSERT INTO user (first_name, last_name, phone_number, email, password, user_type_id, verified, verification_token, token_expires_at)
      VALUES (?, ?, ?, ?, '', ?, 0, ?, ?)
    `).run(normalizedFirstName, normalizedLastName, phone_number || null, normalizedEmail, typeRow.user_type_id, token, expiresAt);

    let emailSent = true;
    try {
      await mailer.sendAdminInviteEmail({ to: normalizedEmail, firstName: normalizedFirstName, role: user_type, token });
    } catch (error) {
      emailSent = false;
      console.error('Admin invite email error:', error);
    }

    eventBus.publish(EVENTS.USER_INVITED, {
      invitedBy: auth.user.email,
      email: normalizedEmail,
      role: user_type,
      userId: Number(result.lastInsertRowid),
      resent: false,
      invitedAt: clock.nowIso(),
    });

    const devVerificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}`;

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent
        ? `User created. An invite email has been sent to ${normalizedEmail}.`
        : `User created. Email delivery is unavailable; use the verification link below for ${normalizedEmail}.`,
      verificationUrl: process.env.NODE_ENV === 'production' ? undefined : devVerificationUrl,
      user: {
        user_id: result.lastInsertRowid,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        email: normalizedEmail,
        user_type,
        verified: false,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAccess(request, db, { minAccessRank: 100 });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { user_id, new_role } = body;

    if (!user_id || !new_role) {
      return NextResponse.json({ error: 'user_id and new_role are required' }, { status: 400 });
    }

    if (!['public', 'staff', 'admin'].includes(new_role)) {
      return NextResponse.json(
        { error: 'new_role must be "staff" or "admin"' },
        { status: 400 }
      );
    }

    const targetUser = db.prepare('SELECT user_id, email FROM user WHERE user_id = ?').get(user_id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.email === auth.user.email && new_role !== 'admin') {
      return NextResponse.json({ error: 'You cannot demote your own account' }, { status: 400 });
    }

    const typeRow = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get(new_role);
    db.prepare('UPDATE user SET user_type_id = ? WHERE user_id = ?').run(typeRow.user_type_id, user_id);

    return NextResponse.json({
      success: true,
      message: `User role updated to ${new_role}`,
    });
  } catch (error) {
    console.error('Admin users PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAccess(request, db, { minAccessRank: 100 });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const targetUser = db.prepare('SELECT email FROM user WHERE user_id = ?').get(Number(userId));
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.email === auth.user.email) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    db.prepare('DELETE FROM user WHERE user_id = ?').run(Number(userId));

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Admin users DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
