const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

import { GET, POST } from '@/app/api/categories/route';

describe('/api/categories', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('GET returns category list', async () => {
    prepareMock.mockReturnValue({ all: vi.fn(() => [{ category_id: 1, category_name: 'Ops' }]) });

    const res = await GET(new Request('http://localhost:3000/api/categories'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.total).toBe(1);
  });

  test('POST returns 400 when category_name missing', async () => {
    const req = new Request('http://localhost:3000/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'x' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
