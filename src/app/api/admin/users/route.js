/**
 * ============================================================================
 * ADMIN USERS API — src/app/api/admin/users/route.js
 * ============================================================================
 * Updated POST handler: no longer requires a password from the admin.
 * Instead, creates the user unverified and sends them an invite email
 * with a link to set their own password.
 *
 * Only the POST handler is updated below — GET, PUT, DELETE are unchanged.
 * Replace your existing POST in this file with this one.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import db, { initializeDatabase } from '@/lib/db';
import { sendAdminInviteEmail } from '@/lib/email';

// ── Helper: verify the requester is an admin ────────────────────────────────
function verifyAdmin(requesterEmail) {
  if (!requesterEmail) return null;

  const requester = db.prepare(`
    SELECT u.user_id, ut.type as user_type
    FROM user u
    JOIN user_type ut ON u.user_type_id = ut.user_type_id
    WHERE u.email = ?
  `).get(requesterEmail);

  if (!requester || requester.user_type !== 'admin') return null;
  return requester;
}

// ── GET: List all staff/admin users ─────────────────────────────────────────
export async function GET(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const requesterEmail = searchParams.get('email');

    if (!verifyAdmin(requesterEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

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
      ORDER BY ut.access_rank DESC, u.last_name ASC, u.first_name ASC
    `).all();

    return NextResponse.json({ success: true, users, total: users.length });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Add a new staff/admin user (sends invite email) ───────────────────
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    // NOTE: password is no longer accepted — user sets it via email link
    const { requesterEmail, first_name, last_name, phone_number, email, user_type } = body;

    if (!verifyAdmin(requesterEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Validate required fields (password removed)
    if (!first_name || !last_name || !email || !user_type) {
      return NextResponse.json(
        { error: 'All fields are required (first_name, last_name, email, user_type)' },
        { status: 400 }
      );
    }

    // Only allow staff or admin roles
    if (!['staff', 'admin'].includes(user_type)) {
      return NextResponse.json(
        { error: 'user_type must be "staff" or "admin"' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = db.prepare('SELECT user_id, verified FROM user WHERE email = ?').get(email);
    if (existing) {
      if (!existing.verified) {
        // Resend the invite if they haven't verified yet
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        db.prepare(`
          UPDATE user SET verification_token = ?, token_expires_at = ? WHERE user_id = ?
        `).run(token, expiresAt, existing.user_id);

        await sendAdminInviteEmail({ to: email, firstName: first_name, role: user_type, token });

        return NextResponse.json({
          success: true,
          message: 'This user exists but hasn\'t verified yet. A new invite email has been sent.',
        });
      }

      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Validate phone number if provided
    if (phone_number && !/^\d{10}$/.test(phone_number.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }

    // Get the user_type_id
    const typeRow = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get(user_type);
    if (!typeRow) {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
    }

    // Generate verification token (expires in 24 hours)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insert unverified user (empty password placeholder — set on /verify page)
    const result = db.prepare(`
      INSERT INTO user (first_name, last_name, phone_number, email, password, user_type_id, verified, verification_token, token_expires_at)
      VALUES (?, ?, ?, ?, '', ?, 0, ?, ?)
    `).run(first_name, last_name, phone_number || null, email, typeRow.user_type_id, token, expiresAt);

    // Send invite email
    await sendAdminInviteEmail({ to: email, firstName: first_name, role: user_type, token });

    return NextResponse.json({
      success: true,
      message: `User created. An invite email has been sent to ${email}.`,
      user: {
        user_id: result.lastInsertRowid,
        first_name,
        last_name,
        email,
        user_type,
        verified: false,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT: Update a user's role ───────────────────────────────────────────────
export async function PUT(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const { requesterEmail, user_id, new_role } = body;

    if (!verifyAdmin(requesterEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    if (!user_id || !new_role) {
      return NextResponse.json(
        { error: 'user_id and new_role are required' },
        { status: 400 }
      );
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

    if (targetUser.email === requesterEmail && new_role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot demote your own account' },
        { status: 400 }
      );
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

// ── DELETE: Remove a user account ───────────────────────────────────────────
export async function DELETE(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const requesterEmail = searchParams.get('email');
    const userId = searchParams.get('user_id');

    if (!verifyAdmin(requesterEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const targetUser = db.prepare('SELECT email FROM user WHERE user_id = ?').get(Number(userId));

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.email === requesterEmail) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
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
