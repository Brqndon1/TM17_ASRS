import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data", "surveys.json");

async function readSurveys() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}

async function writeSurveys(surveys) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(surveys, null, 2), "utf8");
}

export async function GET() {
  const surveys = await readSurveys();
  return new Response(JSON.stringify(surveys), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, questions } = body || {};
    if (!title || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const surveys = await readSurveys();
    const newSurvey = {
      id: Date.now().toString(),
      title,
      description: description || "",
      questions: questions.map((q) => ({ id: Date.now() + Math.random(), text: q })),
      createdAt: new Date().toISOString(),
      published: true
    };
    surveys.push(newSurvey);
    await writeSurveys(surveys);
    return new Response(JSON.stringify(newSurvey), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}