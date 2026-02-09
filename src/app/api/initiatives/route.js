import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const INITIATIVES_PATH = path.join(process.cwd(), 'src', 'data', 'initiatives.json');

async function readInitiatives() {
  try {
    const data = await fs.readFile(INITIATIVES_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed.initiatives) ? parsed.initiatives : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeInitiatives(initiatives) {
  await fs.writeFile(
    INITIATIVES_PATH,
    JSON.stringify({ initiatives }, null, 2),
    'utf8'
  );
}

// GET - Fetch all initiatives from initiatives.json
export async function GET() {
  // TODO: Replace with database query once the initiative table has been created. 
  // Example: 
  // const initiatives = db.prepare(
  //   'SELECT * FROM initiatives;'
  // ).all();
  try {
    const initiatives = await readInitiatives();
    return NextResponse.json({ initiatives });
  } catch (error) {
    console.error('Error reading initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to load initiatives', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new initiative and save to initiatives.json
export async function POST(request) {
  // TODO: Insert into database once the table has been created. 
    // Example: 
    // const result = db.prepare(
    //   'INSERT INTO initiatives (name, description, attributes, settings) VALUES (?, ?, ?, ?);'
    // ).run(name, description, attributes, settings);
  try {
    const body = await request.json();
    const { name, description, attributes, settings, questions} = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }
    
    const initiatives = await readInitiatives();
    const nextId =
      initiatives.length > 0
        ? Math.max(...initiatives.map((i) => i.id)) + 1
        : 1;

    const newInitiative = {
      id: nextId,
      name: name.trim(),
      description: (description || '').trim(),
      attributes: Array.isArray(attributes) ? attributes : [],
      questions: Array.isArray(questions) ? questions: [],
      ...(settings && typeof settings === 'object' ? { settings } : {}),
    };

    initiatives.push(newInitiative);
    await writeInitiatives(initiatives);

    return NextResponse.json({
      success: true,
      message: 'Initiative created and added to initiatives.json',
      initiative: newInitiative,
    });
  } catch (error) {
    console.error('Error creating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative', details: error.message },
      { status: 500 }
    );
  }
}
