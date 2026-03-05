const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: { prepare: prepareMock },
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

import { GET, POST, PUT, DELETE } from '@/app/api/goals/route';

describe('/api/goals', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('GET requires initiativeId', async () => {
    const res = await GET(new Request('http://localhost:3000/api/goals'));
    expect(res.status).toBe(400);
  });

  test('POST rejects invalid scoring_method', async () => {
    const req = new Request('http://localhost:3000/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initiative_id: 1,
        goal_name: 'G1',
        target_metric: 'M',
        target_value: 100,
        weight: 1,
        scoring_method: 'bad',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('PUT requires goal_id', async () => {
    const req = new Request('http://localhost:3000/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_name: 'x' }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  test('DELETE requires goalId query param', async () => {
    const res = await DELETE(new Request('http://localhost:3000/api/goals'));
    expect(res.status).toBe(400);
  });
});
