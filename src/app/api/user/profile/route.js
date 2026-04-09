/**
 * ============================================================================
 * /api/user/profile — Self-service profile management
 * ============================================================================
 * GET  — fetch the current user's profile (name, email, phone, picture)
 * PUT  — update name, email, phone, password, and/or profile picture
 * DELETE — permanently delete own account from the database
 *
 * All three handlers require a valid session (minAccessRank: 10 = public+).
 *
 * Place this file at:
 *   src/app/api/user/profile/route.js
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requireAuth } from '@/lib/auth/server-auth';
import { hashPassword, verifyPassword } from '@/lib/auth/passwords';

// ─── Migration: add profile_picture column if it doesn't exist ───────────────
function ensureProfilePictureColumn(db) {
  try {
    db.exec(`ALTER TABLE user ADD COLUMN profile_picture TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }
}

// ─── GET /api/user/profile ────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    ensureProfilePictureColumn(db);

    const auth = requireAuth(request, db, { requireCsrf: false });
    if (auth.error) return auth.error;

    const user = db.prepare(`
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone_number,
             u.profile_picture, ut.type AS user_type
      FROM user u
      LEFT JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.user_id = ?
    `).get(auth.user.user_id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch submissions made by this user
    const submissions = db.prepare(`
      SELECT s.submission_id, s.submitted_at, i.initiative_name
      FROM submission s
      LEFT JOIN initiative i ON s.initiative_id = i.initiative_id
      WHERE s.submitted_by_user_id = ?
      ORDER BY s.submitted_at DESC
    `).all(auth.user.user_id);

    return NextResponse.json({ user, submissions });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── PUT /api/user/profile ────────────────────────────────────────────────────
export async function PUT(request) {
  try {
    const { db } = getServiceContainer();
    ensureProfilePictureColumn(db);

    const auth = requireAuth(request, db, { requireCsrf: true });
    if (auth.error) return auth.error;

    const { first_name, last_name, email, phone_number, current_password, new_password, profile_picture } =
      await request.json();

    const normalizedFirst = String(first_name || '').trim();
    const normalizedLast  = String(last_name  || '').trim();
    const normalizedEmail = String(email       || '').trim().toLowerCase();

    if (!normalizedFirst || !normalizedLast || !normalizedEmail) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (phone_number && !/^\d{10}$/.test(phone_number.replace(/\D/g, ''))) {
      return NextResponse.json({ error: 'Phone number must be 10 digits' }, { status: 400 });
    }

    // Check email uniqueness (exclude self)
    const emailConflict = db.prepare(
      'SELECT user_id FROM user WHERE email = ? AND user_id != ?'
    ).get(normalizedEmail, auth.user.user_id);

    if (emailConflict) {
      return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 });
    }

    // Validate profile picture size (limit ~1 MB base64 ≈ 1_400_000 chars)
    if (profile_picture && profile_picture.length > 1_400_000) {
      return NextResponse.json({ error: 'Profile picture is too large. Please use an image under 1 MB.' }, { status: 400 });
    }

    // Password change: require current password + validate new password
    let newPasswordHash = null;
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      }
      if (new_password.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }
      const currentUser = db.prepare('SELECT password FROM user WHERE user_id = ?').get(auth.user.user_id);
      if (!verifyPassword(current_password, currentUser.password)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      newPasswordHash = hashPassword(new_password);
    }

    // Build dynamic UPDATE
    const fields  = ['first_name = ?', 'last_name = ?', 'email = ?', 'phone_number = ?'];
    const values  = [normalizedFirst, normalizedLast, normalizedEmail, phone_number || null];

    if (newPasswordHash) {
      fields.push('password = ?');
      values.push(newPasswordHash);
    }

    // profile_picture: undefined = no change, null = clear it, string = set it
    if (profile_picture !== undefined) {
      fields.push('profile_picture = ?');
      values.push(profile_picture || null);
    }

    values.push(auth.user.user_id);
    db.prepare(`UPDATE user SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);

    // Return the fresh profile so the client can update auth store
    const updated = db.prepare(`
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone_number,
             u.profile_picture, ut.type AS user_type
      FROM user u
      LEFT JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.user_id = ?
    `).get(auth.user.user_id);

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── DELETE /api/user/profile ─────────────────────────────────────────────────
export async function DELETE(request) {
  try {
    const { db } = getServiceContainer();

    const auth = requireAuth(request, db, { requireCsrf: true });
    if (auth.error) return auth.error;

    // Prevent the only admin from deleting themselves
    if (auth.user.permissions?.includes('users.manage')) {
      const adminCount = db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM user u
        JOIN user_type ut ON u.user_type_id = ut.user_type_id
        WHERE ut.type = 'admin'
      `).get();
      if (adminCount.cnt <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the only admin account. Promote another user to admin first.' },
          { status: 403 }
        );
      }
    }

    db.prepare('DELETE FROM user WHERE user_id = ?').run(auth.user.user_id);

    return NextResponse.json({ success: true, message: 'Account deleted.' });
  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}