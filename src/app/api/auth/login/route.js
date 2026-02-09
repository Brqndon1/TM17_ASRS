import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

export async function POST(request) {
  try {
    initializeDatabase();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Check if user exists with this email and password
    const user = db.prepare(`
      SELECT u.*, ut.type as user_type
      FROM user u
      LEFT JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.email = ? AND u.password = ?
    `).get(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
