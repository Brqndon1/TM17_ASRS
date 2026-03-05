vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(), run: vi.fn() })),
  },
  db: {
    prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(), run: vi.fn() })),
  },
  initializeDatabase: vi.fn(),
}));

vi.mock('@/lib/query-helpers', () => ({
  queryTableData: vi.fn(() => []),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

import { POST, DELETE } from '@/app/api/reports/route';

describe('/api/reports extra coverage', () => {
  test('POST rejects invalid payload', async () => {
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiativeId: 'bad' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('DELETE rejects missing id', async () => {
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'DELETE',
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
