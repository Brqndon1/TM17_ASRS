import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

/**
 * ============================================================================
 * ADMIN USERS API — /api/admin/users
 * ============================================================================
 * Supports:
 *   GET    — List all staff/admin users
 *   POST   — Add a new staff/admin user
 *   PUT    — Update a user's role (staff ↔ admin)
 *   DELETE — Remove a user account
 *
 * All endpoints verify the requester is an admin before proceeding.
 *
 * [API ADJUSTMENT] When you add proper session/JWT auth, replace the
 * email-based admin check with session validation middleware.
 * ============================================================================
 */

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
        ut.type as user_type,
        ut.access_rank
      FROM user u
      JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE ut.type IN ('public', 'staff', 'admin')
      ORDER BY ut.access_rank DESC, u.last_name ASC, u.first_name ASC
    `).all();

    return NextResponse.json({ success: true, users, total: users.length });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Add a new staff/admin user ────────────────────────────────────────
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const { requesterEmail, first_name, last_name, phone_number, email, password, user_type } = body;

    if (!verifyAdmin(requesterEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !user_type) {
      return NextResponse.json(
        { error: 'All fields are required (first_name, last_name, email, password, user_type)' },
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
    const existing = db.prepare('SELECT user_id FROM user WHERE email = ?').get(email);
    if (existing) {
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
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      INSERT INTO user (first_name, last_name, phone_number, email, password, user_type_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(first_name, last_name, phone_number, email, password, typeRow.user_type_id);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        user_id: result.lastInsertRowid,
        first_name,
        last_name,
        email,
        user_type,
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

    // Prevent admin from demoting themselves
    const admin = verifyAdmin(requesterEmail);
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
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
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