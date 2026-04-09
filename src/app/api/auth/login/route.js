import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { applySessionCookies, createSession, getUserPermissions } from '@/lib/auth/server-auth';
import { verifyPassword } from '@/lib/auth/passwords';
import { isPasswordHash } from '@/lib/auth/passwords';
import { hashPassword } from '@/lib/auth/passwords';

export async function POST(request) {
  try {
    const { db } = getServiceContainer();
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = db.prepare(`
      SELECT u.*, ut.type as user_type
      FROM user u
      LEFT JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.email = ?
    `).get(normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: 'User does not exist' }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password);

    if (!isValid){
      return NextResponse.json({ error: 'Password is incorrect' }, { status: 401 });
    } 

    if (!isPasswordHash(user.password)) {
      const newHash = hashPassword(user.password);

      // Migrate any plaintext passwords stored in the DB to a hashed format.
      // This uses the same SQLite DB API used elsewhere in the codebase.
      db.prepare(`
        UPDATE user
        SET password = ?
        WHERE user_id = ?
      `).run(newHash, user.user_id);
    }

    // if (!user || !verifyPassword(password, user.password)) {
    //   return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    // }

    if (!user.verified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in. Check your inbox for the verification link.' },
        { status: 403 }
      );
    }

    const { token, csrfToken } = createSession(db, user.user_id);
    const permissions = getUserPermissions(db, user.user_id);

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
        permissions,
      },
    });

    return applySessionCookies(response, token, csrfToken);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
