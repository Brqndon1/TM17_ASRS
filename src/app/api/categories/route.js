import { db, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

const MAX_CATEGORIES = 7;

/**
 * GET /api/categories
 * Fetch all categories
 */
export async function GET(request) {
  try {
    initializeDatabase();

    const categories = db
      .prepare('SELECT * FROM category ORDER BY created_at DESC')
      .all();

    return NextResponse.json({
      success: true,
      categories,
      total: categories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category
 * Body: { category_name: string, description?: string }
 */
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const { category_name, description } = body;

    // Validate required field
    if (!category_name || !category_name.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: category_name' },
        { status: 400 }
      );
    }

    const trimmedName = category_name.trim();

    // Check if category limit is reached
    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM category')
      .get();

    if (countResult.count >= MAX_CATEGORIES) {
      return NextResponse.json(
        { error: `Cannot create more than ${MAX_CATEGORIES} categories` },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = db
      .prepare('SELECT category_id FROM category WHERE category_name = ?')
      .get(trimmedName);

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    // Insert new category
    const result = db
      .prepare(
        'INSERT INTO category (category_name, description) VALUES (?, ?)'
      )
      .run(trimmedName, description ? description.trim() : null);

    // Fetch the newly created category
    const newCategory = db
      .prepare('SELECT * FROM category WHERE category_id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json(
      {
        success: true,
        category: newCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error.message },
      { status: 500 }
    );
  }
}
