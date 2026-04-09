const prepareMock = vi.hoisted(() => vi.fn());
const execMock = vi.hoisted(() => vi.fn());
const requirePermissionMock = vi.hoisted(() => vi.fn());
const hashPasswordMock = vi.hoisted(() => vi.fn(() => 'hashed_pw'));
const verifyPasswordMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: {
      prepare: prepareMock,
      exec: execMock,
    },
  }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: requirePermissionMock,
  requireAuth: requirePermissionMock,
}));

vi.mock('@/lib/auth/passwords', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));

import { GET, PUT, DELETE } from '@/app/api/user/profile/route';

describe('/api/user/profile', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    execMock.mockReset();
    requirePermissionMock.mockReset();
    hashPasswordMock.mockClear();
    verifyPasswordMock.mockClear();
  });

  test('GET returns auth error when unauthorized', async () => {
    const unauthorized = new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
    requirePermissionMock.mockReturnValue({ error: unauthorized });

    const req = new Request('http://localhost:3000/api/user/profile');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test('GET returns profile and submissions when authorized', async () => {
    requirePermissionMock.mockReturnValue({ user: { user_id: 5, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } });

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('FROM user u')) {
        return {
          get: vi.fn(() => ({
            user_id: 5,
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            phone_number: '1234567890',
            profile_picture: null,
            user_type: 'staff',
          })),
        };
      }

      if (sql.includes('FROM submission s')) {
        return {
          all: vi.fn(() => [
            { submission_id: 9, submitted_at: '2026-03-05', initiative_name: 'Init A' },
          ]),
        };
      }

      return { get: vi.fn(), all: vi.fn(), run: vi.fn() };
    });

    const req = new Request('http://localhost:3000/api/user/profile');
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.user.email).toBe('test@example.com');
    expect(payload.submissions).toHaveLength(1);
  });

  test('PUT returns 400 for invalid email format', async () => {
    requirePermissionMock.mockReturnValue({ user: { user_id: 5, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } });

    const req = new Request('http://localhost:3000/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'User',
        email: 'invalid-email',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  test('DELETE blocks deleting only admin account', async () => {
    requirePermissionMock.mockReturnValue({ user: { user_id: 1, user_type: 'admin', permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } });

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('COUNT(*) AS cnt')) {
        return { get: vi.fn(() => ({ cnt: 1 })) };
      }
      return { run: vi.fn(), get: vi.fn() };
    });

    const req = new Request('http://localhost:3000/api/user/profile', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    const payload = await res.json();

    expect(res.status).toBe(403);
    expect(payload.error).toContain('only admin');
  });
});
