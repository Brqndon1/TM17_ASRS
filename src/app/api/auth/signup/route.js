import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

export async function POST(request) {
  try {
    initializeDatabase();

    const { first_name, last_name, phone_number, email, password } = await request.json();

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
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
    const existingUser = db.prepare('SELECT user_id FROM user WHERE email = ?').get(email);
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
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

    // Get the 'public' user type ID (default for new signups)
    const publicType = db.prepare('SELECT user_type_id FROM user_type WHERE type = ?').get('public');
    
    if (!publicType) {
      return NextResponse.json(
        { error: 'User type configuration error' },
        { status: 500 }
      );
    }

    // Insert new user
    const result = db.prepare(`
      INSERT INTO user (first_name, last_name, phone_number, email, password, user_type_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(first_name, last_name, phone_number, email, password, publicType.user_type_id);

    // Return success with user info (excluding password)
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        user_id: result.lastInsertRowid,
        first_name,
        last_name,
        email,
        user_type: 'public'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}