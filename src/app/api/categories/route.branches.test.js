const prepareMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ db: { prepare: prepareMock }, initializeDatabase: vi.fn() }));
vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: () => ({ user: { permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
  requireAuth: () => ({ user: { permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
}));
import { POST } from '@/app/api/categories/route';

describe('/api/categories extra branches', () => {
  beforeEach(() => prepareMock.mockReset());

  test('POST max category, duplicate, and success', async () => {
    const mkReq = (body) => new Request('http://localhost:3000/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) return { get: () => ({ count: 7 }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await POST(mkReq({ category_name: 'Ops' }))).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) return { get: () => ({ count: 1 }) };
      if (query.includes('SELECT category_id FROM category WHERE category_name = ?')) return { get: () => ({ category_id: 1 }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await POST(mkReq({ category_name: 'Ops' }))).status).toBe(409);

    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) return { get: () => ({ count: 1 }) };
      if (query.includes('SELECT category_id FROM category WHERE category_name = ?')) return { get: () => undefined };
      if (query.includes('INSERT INTO category')) return { run: () => ({ lastInsertRowid: 2 }) };
      if (query.includes('SELECT * FROM category WHERE category_id = ?')) return { get: () => ({ category_id: 2, category_name: 'Ops' }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await POST(mkReq({ category_name: 'Ops' }))).status).toBe(201);

  });
});
