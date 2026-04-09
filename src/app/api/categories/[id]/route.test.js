const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: () => ({ user: { user_id: 1, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
  requireAuth: () => ({ user: { user_id: 1, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
}));

import { GET, PUT, DELETE } from '@/app/api/categories/[id]/route';

describe('/api/categories/:id', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('GET returns 404 when category not found', async () => {
    prepareMock.mockReturnValue({ get: vi.fn(() => undefined) });

    const res = await GET(new Request('http://localhost:3000/api/categories/99'), { params: Promise.resolve({ id: '99' }) });
    expect(res.status).toBe(404);
  });

  test('PUT returns 409 when renaming to duplicate category', async () => {
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM category WHERE category_id = ?')) {
        return { get: vi.fn(() => ({ category_id: 2, category_name: 'Original', description: 'd' })) };
      }
      if (sql.includes('SELECT category_id FROM category WHERE category_name = ?')) {
        return { get: vi.fn(() => ({ category_id: 3 })) };
      }
      return { get: vi.fn(), run: vi.fn() };
    });

    const req = new Request('http://localhost:3000/api/categories/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_name: 'Duplicate' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(409);
  });

  test('DELETE returns 404 when category not found', async () => {
    prepareMock.mockReturnValue({ get: vi.fn(() => undefined), run: vi.fn() });

    const res = await DELETE(new Request('http://localhost:3000/api/categories/2'), { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(404);
  });
});
