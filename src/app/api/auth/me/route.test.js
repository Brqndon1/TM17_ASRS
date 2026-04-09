vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({ db: { prepare: vi.fn() } }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: () => ({
    user: {
      user_id: 1,
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      user_type: 'admin',
      permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'],
    },
  }),
  requireAuth: () => ({
    user: {
      user_id: 1,
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      user_type: 'admin',
      permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'],
    },
  }),
}));

import { GET } from '@/app/api/auth/me/route';

describe('/api/auth/me GET', () => {
  test('returns authenticated user payload', async () => {
    const res = await GET(new Request('http://localhost:3000/api/auth/me'));
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.user.email).toBe('admin@test.com');
  });
});
