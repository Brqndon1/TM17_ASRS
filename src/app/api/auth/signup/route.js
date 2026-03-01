/**
 * ============================================================================
 * SIGNUP API — src/app/api/auth/signup/route.js
 * ============================================================================
 * Creates a new public user (unverified) and sends a verification email.
 * The user cannot log in until they click the link and set their password.
 *
 * NOTE: Password from the signup form is intentionally ignored here.
 * The user sets their real password on the /verify page after confirming
 * their email. You can remove the password field from your signup form UI.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import db, { initializeDatabase } from '@/lib/db';
import { sendSignupVerificationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    initializeDatabase();

    const { first_name, last_name, phone_number, email } = await request.json();

    // Validate required fields (password no longer required at signup)
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
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

    // Check if user already exists
    const existingUser = db.prepare('SELECT user_id, verified FROM user WHERE email = ?').get(email);

    if (existingUser) {
      if (!existingUser.verified) {
        // Already signed up but not verified — resend the email
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        db.prepare(`
          UPDATE user SET verification_token = ?, token_expires_at = ? WHERE user_id = ?
        `).run(token, expiresAt, existingUser.user_id);

        await sendSignupVerificationEmail({ to: email, firstName: first_name, token });

        return NextResponse.json({
          success: true,
          message: 'A new verification email has been sent. Please check your inbox.',
        });
      }

      return NextResponse.json(
        { error: 'This email is already registered. Please log in.' },
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

    // Get public user type
    const publicType = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get('public');
    if (!publicType) {
      return NextResponse.json({ error: 'User type configuration error' }, { status: 500 });
    }

    // Generate verification token (expires in 24 hours)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insert unverified user (password is empty placeholder — set on /verify page)
    db.prepare(`
      INSERT INTO user (first_name, last_name, phone_number, email, password, user_type_id, verified, verification_token, token_expires_at)
      VALUES (?, ?, ?, ?, '', ?, 0, ?, ?)
    `).run(first_name, last_name, phone_number || null, email, publicType.user_type_id, token, expiresAt);

    // Send verification email
    await sendSignupVerificationEmail({ to: email, firstName: first_name, token });

    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email to verify your address.',
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
