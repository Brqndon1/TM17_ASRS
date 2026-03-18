const state = vi.hoisted(() => ({ db: null }));
const dbProxy = vi.hoisted(() => ({
  prepare: (...args) => state.db.prepare(...args),
  transaction: (...args) => state.db.transaction(...args),
  exec: (...args) => state.db.exec(...args),
}));
const generateAIReportMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: dbProxy,
  db: dbProxy,
  initializeDatabase: vi.fn(),
}));

vi.mock('@/lib/openai', () => ({
  generateAIReport: (...args) => generateAIReportMock(...args),
}));

import { GET, POST } from '@/app/api/surveys/route';
import {
  closeTestDb,
  createAuthedRequestHeaders,
  createSessionForRank,
  createTestDb,
} from '@/test/integration/api-test-harness';

describe('/api/surveys integration', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    state.db = createTestDb();
    generateAIReportMock.mockReset();
    generateAIReportMock.mockResolvedValue({ summary: 'ok', insights: ['one'] });
  });

  afterEach(() => {
    closeTestDb(state.db);
    state.db = null;
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST validates required fields', async () => {
    const req = new Request('http://localhost:3000/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('POST persists survey and report', async () => {
    const req = new Request('http://localhost:3000/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex',
        email: 'a@example.com',
        responses: { q1: 'yes', q2: 4 },
      }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.report.summary).toBe('ok');

    const surveyCount = state.db.prepare('SELECT COUNT(*) AS c FROM surveys').get().c;
    const reportCount = state.db.prepare('SELECT COUNT(*) AS c FROM reports WHERE survey_id IS NOT NULL').get().c;
    expect(surveyCount).toBe(1);
    expect(reportCount).toBe(1);
  });

  test('GET requires auth outside test env', async () => {
    process.env.NODE_ENV = 'development';

    const res = await GET(new Request('http://localhost:3000/api/surveys'));
    expect(res.status).toBe(401);
  });

  test('GET returns parsed surveys when authorized', async () => {
    process.env.NODE_ENV = 'development';

    const surveyId = Number(state.db.prepare(
      'INSERT INTO surveys (name, email, responses, submitted_at) VALUES (?, ?, ?, ?)'
    ).run('Jordan', 'j@example.com', JSON.stringify({ q1: 'yes' }), '2026-03-05T00:00:00.000Z').lastInsertRowid);

    state.db.prepare(
      'INSERT INTO reports (survey_id, report_data, created_at) VALUES (?, ?, ?)'
    ).run(surveyId, JSON.stringify({ summary: 'great' }), '2026-03-05T00:00:00.000Z');

    const tokens = createSessionForRank(state.db, { rank: 100, verified: 1 });

    const res = await GET(new Request('http://localhost:3000/api/surveys', {
      headers: createAuthedRequestHeaders(tokens),
    }));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.surveys).toHaveLength(1);
    expect(payload.surveys[0].responses.q1).toBe('yes');
    expect(payload.surveys[0].report.summary).toBe('great');
  });

  test('GET denies staff access to PII endpoint', async () => {
    process.env.NODE_ENV = 'development';

    const tokens = createSessionForRank(state.db, { rank: 50, verified: 1 });
    const res = await GET(new Request('http://localhost:3000/api/surveys', {
      headers: createAuthedRequestHeaders(tokens),
    }));
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload.error).toContain('insufficient permissions');
  });

  test('GET returns 500 when stored survey JSON is malformed', async () => {
    process.env.NODE_ENV = 'development';

    state.db.prepare(
      'INSERT INTO surveys (name, email, responses) VALUES (?, ?, ?)'
    ).run('Broken', 'b@example.com', 'not-json');

    const tokens = createSessionForRank(state.db, { rank: 100, verified: 1 });

    const res = await GET(new Request('http://localhost:3000/api/surveys', {
      headers: createAuthedRequestHeaders(tokens),
    }));

    expect(res.status).toBe(500);
  });
});
