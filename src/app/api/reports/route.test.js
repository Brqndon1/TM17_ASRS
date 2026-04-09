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
  requirePermission: () => ({ user: { user_id: 1, user_type: 'staff', permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
  requireAuth: () => ({ user: { user_id: 1, user_type: 'staff', permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
}));

import { GET, PUT } from '@/app/api/reports/route';

describe('/api/reports route validation', () => {
  test('GET rejects invalid initiativeId query', async () => {
    const req = new Request('http://localhost:3000/api/reports?initiativeId=abc');
    const res = await GET(req);
    const payload = await res.json();
    expect(res.status).toBe(400);
    expect(payload.error).toContain('initiativeId');
  });

  test('PUT rejects invalid payload shape', async () => {
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, status: 'bogus' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
