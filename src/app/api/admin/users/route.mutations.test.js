const prepareMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    mailer: { sendAdminInviteEmail: vi.fn() },
    clock: { now: () => new Date('2026-03-05T00:00:00.000Z'), nowIso: () => '2026-03-05T00:00:00.000Z' },
    eventBus: { publish: vi.fn() },
  }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: () => ({
    error: new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 }),
  }),
  requireAuth: () => ({
    error: new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 }),
  }),
}));

import { POST, PUT, DELETE } from '@/app/api/admin/users/route';

describe('/api/admin/users mutations', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    prepareMock.mockImplementation(() => ({ get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) }));
  });

  test('POST returns 403 for non-admin requester', async () => {
    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test('PUT returns 403 for non-admin requester', async () => {
    const req = new Request('http://localhost:3000/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 2, new_role: 'admin' }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  test('DELETE returns 403 for non-admin requester', async () => {
    const req = new Request('http://localhost:3000/api/admin/users?user_id=2', {
      method: 'DELETE',
    });

    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });
});
