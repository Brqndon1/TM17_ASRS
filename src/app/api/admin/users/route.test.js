const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: { prepare: prepareMock },
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

import { GET } from '@/app/api/admin/users/route';

describe('/api/admin/users GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('uses staff/admin-only filter and returns user list for admin requester', async () => {
    const getAdmin = vi.fn(() => ({ user_id: 1, user_type: 'admin' }));
    const listAll = vi.fn(() => [
      { user_id: 2, email: 'staff@test.com', user_type: 'staff' },
      { user_id: 1, email: 'admin@test.com', user_type: 'admin' },
    ]);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('WHERE u.email = ?')) {
        return { get: getAdmin };
      }
      if (sql.includes("WHERE ut.type IN ('staff', 'admin')")) {
        return { all: listAll };
      }
      return { get: vi.fn(), all: vi.fn(() => []), run: vi.fn() };
    });

    const req = new Request('http://localhost:3000/api/admin/users?email=admin@test.com');
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.total).toBe(2);
    expect(listAll).toHaveBeenCalled();

    const listQuery = prepareMock.mock.calls
      .map(([query]) => query)
      .find((query) => query.includes('FROM user u') && query.includes('WHERE ut.type IN'));

    expect(listQuery).toContain("WHERE ut.type IN ('staff', 'admin')");
    expect(listQuery).not.toContain("'public'");
  });
});
