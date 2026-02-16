import { db, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/categories/[id]
 * Fetch a single category
 */
export async function GET(_request, { params }) {
  try {
    initializeDatabase();

    // Next.js 15+ requires await on params
    const { id } = await params;

    const category = db
      .prepare('SELECT * FROM category WHERE category_id = ?')
      .get(Number(id));

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[id]
 * Update category name or description
 * Body: { category_name?: string, description?: string }
 */
export async function PUT(request, { params }) {
  try {
    initializeDatabase();

    const { id } = await params;
    const body = await request.json();
    const { category_name, description } = body;
    const categoryId = Number(id);

    // Fetch existing category
    const existing = db
      .prepare('SELECT * FROM category WHERE category_id = ?')
      .get(categoryId);

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Prepare update values (only update provided fields)
    const updateName = category_name
      ? category_name.trim()
      : existing.category_name;
    const updateDesc =
      description !== undefined ? description.trim() || null : existing.description;

    // Check for duplicate name (if name is being changed)
    if (category_name && updateName !== existing.category_name) {
      const duplicate = db
        .prepare('SELECT category_id FROM category WHERE category_name = ?')
        .get(updateName);

      if (duplicate) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update category
    db.prepare(
      "UPDATE category SET category_name = ?, description = ?, updated_at = datetime('now') WHERE category_id = ?"
    ).run(updateName, updateDesc, categoryId);

    // Fetch updated category
    const updated = db
      .prepare('SELECT * FROM category WHERE category_id = ?')
      .get(categoryId);

    return NextResponse.json({
      success: true,
      category: updated,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category
 */
export async function DELETE(_request, { params }) {
  try {
    initializeDatabase();

    const { id } = await params;
    const categoryId = Number(id);

    // Check if category exists
    const existing = db
      .prepare('SELECT * FROM category WHERE category_id = ?')
      .get(categoryId);

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete category
    db.prepare('DELETE FROM category WHERE category_id = ?').run(categoryId);

    return NextResponse.json({
      success: true,
      message: `Category "${existing.category_name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error.message },
      { status: 500 }
    );
  }
}
