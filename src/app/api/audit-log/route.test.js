const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: { prepare: prepareMock },
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

// Default: admin user with access
const mockRequireAccess = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: (...args) => mockRequireAccess(...args),
}));

import { GET } from '@/app/api/audit-log/route';

function mkRequest(queryString = '') {
  return new Request(`http://localhost:3000/api/audit-log${queryString ? '?' + queryString : ''}`);
}

describe('/api/audit-log GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
    mockRequireAccess.mockReset();
    mockRequireAccess.mockReturnValue({
      user: { user_id: 1, email: 'admin@test.com', access_rank: 100, user_type: 'admin' },
    });
  });

  // ── Auth & access control ──

  test('returns 401 when user is not authenticated', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    mockRequireAccess.mockReturnValue({ error: mockResponse });

    const res = await GET(mkRequest());
    expect(res.status).toBe(401);
  });

  test('returns 403 when user is staff (not admin)', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    mockRequireAccess.mockReturnValue({ error: mockResponse });

    const res = await GET(mkRequest());
    expect(res.status).toBe(403);
  });

  test('passes requireCsrf: false so GET works from browser navigation', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    await GET(mkRequest());

    expect(mockRequireAccess).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ minAccessRank: 100, requireCsrf: false })
    );
  });

  // ── Basic response structure ──

  test('returns entries and pagination in correct shape', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 1 }),
      all: () => ([{
        audit_id: 1, event: 'goal.created', user_email: 'admin@test.com',
        target_type: 'goal', target_id: '5', reason_type: null, reason_text: null,
        payload: '{"goal_name":"Test"}', created_at: '2026-03-27T12:00:00Z',
      }]),
    }));

    const res = await GET(mkRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('entries');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].event).toBe('goal.created');
  });

  test('returns empty entries array when no results', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest());
    const data = await res.json();

    expect(data.entries).toEqual([]);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.totalPages).toBe(0);
  });

  // ── Pagination edge cases ──

  test('defaults to page 1 and limit 50', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest());
    const data = await res.json();

    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(50);
  });

  test('respects custom page and limit parameters', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 150 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('page=3&limit=25'));
    const data = await res.json();

    expect(data.pagination.page).toBe(3);
    expect(data.pagination.limit).toBe(25);
    expect(data.pagination.totalPages).toBe(6);
  });

  test('clamps page to minimum of 1 for negative values', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('page=-5'));
    const data = await res.json();

    expect(data.pagination.page).toBe(1);
  });

  test('clamps page to minimum of 1 for page=0', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('page=0'));
    const data = await res.json();

    expect(data.pagination.page).toBe(1);
  });

  test('clamps limit to maximum of 200', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('limit=999'));
    const data = await res.json();

    expect(data.pagination.limit).toBe(200);
  });

  test('clamps limit to minimum of 1', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('limit=0'));
    const data = await res.json();

    expect(data.pagination.limit).toBe(1);
  });

  test('handles non-numeric page gracefully', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 0 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('page=abc'));
    // NaN page means the response may not have clean pagination
    // This documents current behavior rather than asserting ideal behavior
    expect(res.status).toBe(200);
  });

  test('calculates totalPages correctly with partial last page', async () => {
    prepareMock.mockImplementation(() => ({
      get: () => ({ total: 51 }),
      all: () => [],
    }));

    const res = await GET(mkRequest('limit=50'));
    const data = await res.json();

    expect(data.pagination.totalPages).toBe(2);
  });

  // ── Action filter (verb) ──

  test('filters by action verb using LIKE %.created pattern', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('action=created'));

    expect(capturedParams[0]).toBe('%.created');
  });

  test('filters by action=deleted uses %.deleted pattern', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('action=deleted'));

    expect(capturedParams[0]).toBe('%.deleted');
  });

  // ── Entity filter (noun) ──

  test('filters by entity using exact target_type match', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('entity=goal'));

    expect(capturedParams[0]).toBe('goal');
  });

  // ── Combined filters ──

  test('combines action and entity filters together', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('action=updated&entity=goal'));

    expect(capturedParams[0]).toBe('%.updated');
    expect(capturedParams[1]).toBe('goal');
  });

  // ── Date range filters ──

  test('applies startDate filter', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('startDate=2026-03-01'));

    expect(capturedParams[0]).toBe('2026-03-01');
  });

  test('appends 23:59:59 to date-only endDate to include full day', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('endDate=2026-03-28'));

    expect(capturedParams[0]).toBe('2026-03-28 23:59:59');
  });

  test('does not modify endDate if it already has a time component', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('endDate=2026-03-28T15:30:00'));

    expect(capturedParams[0]).toBe('2026-03-28T15:30:00');
  });

  // ── Search filter ──

  test('applies wildcard search across multiple columns', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('search=admin'));

    // Should produce 4 wildcard params for the OR clause
    expect(capturedParams).toEqual(['%admin%', '%admin%', '%admin%', '%admin%']);
  });

  // ── All filters combined ──

  test('combines all filters in correct order', async () => {
    let capturedParams = [];
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: (...args) => { capturedParams = args; return { total: 0 }; } };
      }
      return { get: () => ({ total: 0 }), all: () => [] };
    });

    await GET(mkRequest('action=created&entity=goal&startDate=2026-01-01&endDate=2026-12-31&search=test'));

    expect(capturedParams).toEqual([
      '%.created',           // action
      'goal',                // entity
      '2026-01-01',          // startDate
      '2026-12-31 23:59:59', // endDate (with time appended)
      '%test%', '%test%', '%test%', '%test%', // search wildcards
    ]);
  });

  // ── No filters ──

  test('returns all entries when no filters are applied', async () => {
    let capturedSql = '';
    prepareMock.mockImplementation((sql) => {
      capturedSql = String(sql || '');
      if (capturedSql.includes('COUNT(*)')) {
        return { get: () => ({ total: 5 }) };
      }
      return { get: () => ({ total: 5 }), all: () => [] };
    });

    await GET(mkRequest());

    // The last SQL should NOT contain WHERE
    expect(capturedSql).not.toContain('WHERE');
  });

  // ── Error handling ──

  test('returns 500 when database query throws', async () => {
    prepareMock.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const res = await GET(mkRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to fetch audit log');
    expect(data.details).toBe('Database connection failed');
  });

  test('handles null countRow gracefully (total defaults to 0)', async () => {
    prepareMock.mockImplementation((sql) => {
      const query = String(sql || '');
      if (query.includes('COUNT(*)')) {
        return { get: () => null };
      }
      return { all: () => [] };
    });

    const res = await GET(mkRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pagination.total).toBe(0);
  });
});
