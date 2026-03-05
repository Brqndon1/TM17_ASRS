const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

import { GET, POST, DELETE } from '@/app/api/initiative-categories/route';

describe('/api/initiative-categories', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('GET returns relationships', async () => {
    prepareMock.mockReturnValue({ all: vi.fn(() => [{ initiative_id: 1, category_id: 2 }]) });

    const res = await GET(new Request('http://localhost:3000/api/initiative-categories'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.total).toBe(1);
  });

  test('POST requires initiative_id and category_id', async () => {
    const req = new Request('http://localhost:3000/api/initiative-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiative_id: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('DELETE returns 404 when relationship does not exist', async () => {
    prepareMock.mockReturnValue({ run: vi.fn(() => ({ changes: 0 })) });

    const req = new Request('http://localhost:3000/api/initiative-categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiative_id: 1, category_id: 2 }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
