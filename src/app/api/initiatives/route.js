import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import {db, initializeDatabase} from '@/lib/db';
import path from 'path';

const INITIATIVES_PATH = path.join(process.cwd(), 'src', 'data', 'initiatives.json');

// Read and write initiative from file. 

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
// Old code that reads from file.
 
//   try {
//     const initiatives = await readInitiatives();
//     return NextResponse.json({ initiatives });
//   } catch (error) {
//     console.error('Error reading initiatives:', error);
//     return NextResponse.json(
//       { error: 'Failed to load initiatives', details: error.message },
//       { status: 500 }
//     );
//   }
// }
  

  try
    {
      initializeDatabase();

      // Pull data and map rows and dictionaries to necessary variables. 
      const initiatives = db.prepare('SELECT * FROM initiative').all().map(row => ({
        ...row,
        attributes: row.attributes ? JSON.parse(row.attributes) : [],
        questions: row.questions ? JSON.parse(row.questions) : [],
        settings: row.settings ? JSON.parse(row.settings) : {},
      }
      )
      );
      return NextResponse.json({initiatives});
    }
    catch(error)
    {
      console.error('Error fetching initiatives: ', error);
      return NextResponse.json({error: "Failed to load initiatives"}, {status: 500});
    }
  }

// POST - Create a new initiative and save to initiatives.json
export async function POST(request) {
  // Old code that stores in file. 
  /*
  try {
    const body = await request.json();
    const { name, description, attributes, settings, questions} = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }
    
    const docinitiatives = await readInitiatives();
    const nextId =
      docinitiatives.length > 0
        ? Math.max(...initiatives.map((i) => i.id)) + 1
        : 1;

    const newdocInitiative = {
      id: nextId,
      name: name.trim(),
      description: (description || '').trim(),
      attributes: Array.isArray(attributes) ? attributes : [],
      questions: Array.isArray(questions) ? questions: [],
      ...(settings && typeof settings === 'object' ? { settings } : {}),
    };

    docinitiatives.push(newInitiative);
    await writeInitiatives(initiatives);

    return NextResponse.json({
      success: true,
      message: 'Initiative created and added to initiatives.json',
      initiative: newdocInitiative,
    });
    */


  try
  {
    // if (!verifyAdmin(requesterEmail)) {
    //   error.code = "FORBIDDEN"
    //   return NextResponse.json(
    //     { error: 'Forbidden: Admin access required' },
    //     { status: 403 }
    //   );
    // }

    initializeDatabase(); // initialize the database first
    
    const body = await request.json(); // Get the body from the request
    const {name, description, attributes, settings, questions} = body;

    if (!name || !name.trim()){ // Ensure name field is in there
      return NextResponse.json({error: "Missing required field: name"}, {status: 400});
    }
    // Prepare to insert data into the database in this specific order. 
    const stmt = db.prepare('INSERT INTO initiative (initiative_name, description, settings) VALUES (?, ?, ?)');

    // Insert the data into the database. 
    const result = stmt.run(
      name.trim(),
      description || '',
      JSON.stringify(attributes || []),
      JSON.stringify(settings || {}),
      JSON.stringify(questions || []),
    );

    // Store in the document still
    const docinitiatives = await readInitiatives();
    const nextId =
      docinitiatives.length > 0
        ? Math.max(...docinitiatives.map((i) => i.id)) + 1
        : 1;

    const newdocInitiative = {
      id: nextId,
      name: name.trim(),
      description: (description || '').trim(),
      attributes: Array.isArray(attributes) ? attributes : [],
      questions: Array.isArray(questions) ? questions: [],
      ...(settings && typeof settings === 'object' ? { settings } : {}),
    };

    docinitiatives.push(newdocInitiative);
    await writeInitiatives(docinitiatives);

    // Pull the new initiative that was just created to print. 
    const newInitiative = db.prepare('SELECT initiative_id, initiative_name, description FROM initiative WHERE initiative_id = ?').get(result.lastInsertRowid);

    return NextResponse.json({success: true, initiative: newInitiative});
  }
  catch (error)
  {
    // Catch same initiative name error. 
    if (error.code == 'SQLITE_CONSTRAINT_UNIQUE'){ 
      return NextResponse.json({error: "Initiative with the same name already exists"}, {status: 409});
    }
    console.error('Error creating initiative:', error);
    return NextResponse.json({ error: 'Failed to create initiative', details: error.message }, { status: 500 });
  }
}
