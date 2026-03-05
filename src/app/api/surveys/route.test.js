const prepareMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn((fn) => fn));
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: { prepare: prepareMock, transaction: transactionMock },
  db: { prepare: prepareMock, transaction: transactionMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

vi.mock('@/lib/openai', () => ({
  generateAIReport: vi.fn(async () => ({ summary: 'ok' })),
}));

import { GET, POST } from '@/app/api/surveys/route';

describe('/api/surveys', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    transactionMock.mockClear();
    initializeDatabaseMock.mockReset();
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

  test('GET returns parsed survey rows', async () => {
    prepareMock.mockReturnValue({ all: vi.fn(() => ([{
      id: 1,
      name: 'Alex',
      email: 'a@example.com',
      responses: '{"q1":"yes"}',
      submitted_at: '2026-03-01',
      report_data: '{"summary":"ok"}',
      report_created_at: '2026-03-01',
    }])) });

    const res = await GET(new Request('http://localhost:3000/api/surveys'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.surveys[0].responses.q1).toBe('yes');
  });
});
