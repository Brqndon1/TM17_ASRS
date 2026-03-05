import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getServiceContainer } from '@/lib/container/service-container';
import { toInitiativeCreateInput, toInitiativeDto } from '@/lib/adapters/initiative-adapter';
import { requireAccess } from '@/lib/auth/server-auth';

const INITIATIVES_PATH = path.join(process.cwd(), 'src', 'data', 'initiatives.json');

async function readInitiatives() {
  try {
    const data = await fs.readFile(INITIATIVES_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed.initiatives) ? parsed.initiatives : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeInitiatives(initiatives) {
  await fs.writeFile(
    INITIATIVES_PATH,
    JSON.stringify({ initiatives }, null, 2),
    'utf8'
  );
}

export async function GET() {
  try {
    const { db } = getServiceContainer();
    const rows = db.prepare('SELECT * FROM initiative').all();
    const initiatives = rows.map(toInitiativeDto);
    return NextResponse.json({ initiatives });
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return NextResponse.json({ error: 'Failed to load initiatives' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAccess(request, db, { minAccessRank: 50 });
    if (auth.error) return auth.error;

    const body = await request.json();
    const input = toInitiativeCreateInput(body);

    if (!input.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO initiative (initiative_name, description, attributes, questions, settings) VALUES (?, ?, ?, ?, ?)'
    ).run(
      input.name,
      input.description,
      JSON.stringify(input.attributes),
      JSON.stringify(input.questions),
      JSON.stringify(input.settings)
    );

    const fileInitiatives = await readInitiatives();
    const nextFileId = fileInitiatives.length > 0
      ? Math.max(...fileInitiatives.map((item) => Number(item.id) || 0)) + 1
      : 1;

    fileInitiatives.push({
      id: nextFileId,
      name: input.name,
      description: input.description,
      attributes: input.attributes,
      questions: input.questions,
      ...(Object.keys(input.settings).length > 0 ? { settings: input.settings } : {}),
    });

    await writeInitiatives(fileInitiatives);

    const row = db.prepare('SELECT * FROM initiative WHERE initiative_id = ?').get(Number(result.lastInsertRowid));

    return NextResponse.json({
      success: true,
      initiative: toInitiativeDto(row),
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Initiative with the same name already exists' }, { status: 409 });
    }

    console.error('Error creating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative', details: error.message },
      { status: 500 }
    );
  }
}
