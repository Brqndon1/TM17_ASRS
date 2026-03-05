import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getServiceContainer } from '@/lib/container/service-container';

export async function POST(request) {
  try {
    const { db, mailer, clock } = getServiceContainer();
    const { first_name, last_name, phone_number, email } = await request.json();

    const normalizedFirstName = String(first_name || '').trim();
    const normalizedLastName = String(last_name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const existingUser = db.prepare('SELECT user_id, verified FROM user WHERE email = ?').get(normalizedEmail);

    if (existingUser) {
      if (!existingUser.verified) {
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(clock.now().getTime() + 24 * 60 * 60 * 1000).toISOString();

        db.prepare('UPDATE user SET verification_token = ?, token_expires_at = ? WHERE user_id = ?')
          .run(token, expiresAt, existingUser.user_id);

        let emailSent = true;
        try {
          await mailer.sendSignupVerificationEmail({ to: normalizedEmail, firstName: normalizedFirstName, token });
        } catch (error) {
          emailSent = false;
          console.error('Signup resend email error:', error);
        }

        const devVerificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}`;

        return NextResponse.json({
          success: true,
          emailSent,
          message: emailSent
            ? 'A new verification email has been sent. Please check your inbox.'
            : 'Account exists and a new verification link was generated. Email delivery is unavailable in this environment.',
          verificationUrl: process.env.NODE_ENV === 'production' ? undefined : devVerificationUrl,
        });
      }

      return NextResponse.json(
        { error: 'This email is already registered. Please log in.' },
        { status: 409 }
      );
    }

    if (phone_number && !/^\d{10}$/.test(phone_number.replace(/\D/g, ''))) {
      return NextResponse.json({ error: 'Phone number must be 10 digits' }, { status: 400 });
    }

    const publicType = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get('public');
    if (!publicType) {
      return NextResponse.json({ error: 'User type configuration error' }, { status: 500 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(clock.now().getTime() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO user (first_name, last_name, phone_number, email, password, user_type_id, verified, verification_token, token_expires_at)
      VALUES (?, ?, ?, ?, '', ?, 0, ?, ?)
    `).run(normalizedFirstName, normalizedLastName, phone_number || null, normalizedEmail, publicType.user_type_id, token, expiresAt);

    let emailSent = true;
    try {
      await mailer.sendSignupVerificationEmail({ to: normalizedEmail, firstName: normalizedFirstName, token });
    } catch (error) {
      emailSent = false;
      console.error('Signup email error:', error);
    }

    const devVerificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}`;

    return NextResponse.json(
      {
        success: true,
        emailSent,
        message: emailSent
          ? 'Account created! Please check your email to verify your address.'
          : 'Account created! Email delivery is unavailable in this environment, use the verification link below.',
        verificationUrl: process.env.NODE_ENV === 'production' ? undefined : devVerificationUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
