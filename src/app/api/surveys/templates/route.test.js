const prepareMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../lib/db.js', () => ({
  default: { prepare: prepareMock, transaction: vi.fn((fn) => fn) },
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

import { GET, POST } from '@/app/api/surveys/templates/route';

describe('/api/surveys/templates', () => {
  beforeEach(() => {
    prepareMock.mockReset();
  });

  test('GET returns template list', async () => {
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('FROM form')) return { all: vi.fn(() => []) };
      return { all: vi.fn(() => []) };
    });

    const res = await GET();
    expect(res.status).toBe(200);
  });

  test('POST returns 400 for invalid payload', async () => {
    const req = new Request('http://localhost:3000/api/surveys/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
