const prepareMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn((fn) => fn));
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock, transaction: transactionMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: () => ({ user: { user_id: 1, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
  requireAuth: () => ({ user: { user_id: 1, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
}));

import { PUT } from '@/app/api/reports/reorder/route';

describe('/api/reports/reorder PUT', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    transactionMock.mockClear();
    initializeDatabaseMock.mockReset();
  });

  test('returns 400 for empty order payload', async () => {
    const req = new Request('http://localhost:3000/api/reports/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: [] }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  test('updates display order for valid payload', async () => {
    const runMock = vi.fn();
    prepareMock.mockReturnValue({ run: runMock });

    const req = new Request('http://localhost:3000/api/reports/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: [{ id: 1, display_order: 0 }] }),
    });

    const res = await PUT(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(runMock).toHaveBeenCalledWith(0, 1);
  });
});
