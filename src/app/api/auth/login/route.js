/**
 * ============================================================================
 * LOGIN API — src/app/api/auth/login/route.js
 * ============================================================================
 * Updated to block users who haven't verified their email yet.
 * ============================================================================
 */

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

    // Fetch user by email first (so we can give a specific unverified error)
    const user = db.prepare(`
      SELECT u.*, ut.type as user_type
      FROM user u
      LEFT JOIN user_type ut ON u.user_type_id = ut.user_type_id
      WHERE u.email = ?
    `).get(email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Block login for unverified users
    if (!user.verified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in. Check your inbox for the verification link.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
