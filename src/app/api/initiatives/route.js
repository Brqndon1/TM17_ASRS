import { NextResponse } from 'next/server';

// GET - Fetch all initiatives
export async function GET() {
  // TODO: Replace with database query once initiative table is created
  return NextResponse.json({
    initiatives: [],
    message: 'Initiative retrieval not yet implemented',
  });
}

// POST - Create a new initiative
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, attributes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // TODO: Insert into database once initiative table is created
    // Example:
    //   initializeDatabase();
    //   const result = db.prepare(
    //     'INSERT INTO initiatives (name, description, attributes) VALUES (?, ?, ?)'
    //   ).run(name, description || '', JSON.stringify(attributes || []));

    return NextResponse.json({
      success: true,
      message: 'Initiative creation not yet implemented',
      received: { name, description, attributes },
    });
  } catch (error) {
    console.error('Error creating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative', details: error.message },
      { status: 500 }
    );
  }
}
