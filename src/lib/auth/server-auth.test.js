import {
  applySessionCookies,
  clearSessionCookies,
  createSession,
  getSessionTokenFromRequest,
  requireAccess,
  revokeSessionByToken,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from '@/lib/auth/server-auth';

function mockDbForSession(row) {
  const run = vi.fn();
  return {
    prepare: vi.fn((sql) => {
      if (sql.includes('WHERE s.token_hash = ?')) return { get: vi.fn(() => row) };
      return { get: vi.fn(), run, all: vi.fn(() => []) };
    }),
    run,
  };
}

describe('server-auth helper', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  test('createSession writes session and returns tokens', () => {
    const run = vi.fn();
    const db = { prepare: vi.fn(() => ({ run })) };
    const result = createSession(db, 12);
    expect(result.token).toBeTruthy();
    expect(result.csrfToken).toBeTruthy();
    expect(run).toHaveBeenCalled();
  });

  test('requireAccess returns test user in test env', () => {
    process.env.NODE_ENV = 'test';
    const req = new Request('http://localhost:3000/api/x');
    const auth = requireAccess(req, { prepare: vi.fn() }, { minAccessRank: 100 });
    expect(auth.user.user_type).toBe('admin');
  });

  test('requireAccess returns unauthorized without valid session', () => {
    process.env.NODE_ENV = 'development';
    const db = mockDbForSession(null);
    const req = new Request('http://localhost:3000/api/x', { headers: { cookie: `${SESSION_COOKIE_NAME}=tok` } });
    const auth = requireAccess(req, db, { requireCsrf: false });
    expect(auth.error.status).toBe(401);
  });

  test('requireAccess checks rank and csrf', async () => {
    process.env.NODE_ENV = 'development';
    const goodRow = {
      session_id: 1,
      user_id: 9,
      csrf_token: 'abc',
      expires_at: '2099-01-01T00:00:00.000Z',
      absolute_expires_at: '2099-01-01T00:00:00.000Z',
      revoked_at: null,
      first_name: 'A',
      last_name: 'B',
      email: 'a@x.com',
      verified: 1,
      user_type: 'staff',
      access_rank: 50,
    };

    const lowRankDb = mockDbForSession({ ...goodRow, access_rank: 10 });
    const reqLow = new Request('http://localhost:3000/api/x', { headers: { cookie: `${SESSION_COOKIE_NAME}=tok` } });
    expect(requireAccess(reqLow, lowRankDb, { minAccessRank: 50, requireCsrf: false }).error.status).toBe(403);

    const csrfDb = mockDbForSession(goodRow);
    const reqNoCsrf = new Request('http://localhost:3000/api/x', { method: 'POST', headers: { cookie: `${SESSION_COOKIE_NAME}=tok; ${CSRF_COOKIE_NAME}=abc` } });
    expect(requireAccess(reqNoCsrf, csrfDb, { minAccessRank: 50 }).error.status).toBe(403);

    const reqBadCsrf = new Request('http://localhost:3000/api/x', { method: 'POST', headers: { cookie: `${SESSION_COOKIE_NAME}=tok; ${CSRF_COOKIE_NAME}=abc`, 'x-csrf-token': 'zzz' } });
    expect(requireAccess(reqBadCsrf, csrfDb, { minAccessRank: 50 }).error.status).toBe(403);

    const reqGood = new Request('http://localhost:3000/api/x', { method: 'POST', headers: { cookie: `${SESSION_COOKIE_NAME}=tok; ${CSRF_COOKIE_NAME}=abc`, 'x-csrf-token': 'abc' } });
    expect(requireAccess(reqGood, csrfDb, { minAccessRank: 50 }).user.email).toBe('a@x.com');
  });

  test('requireAccess revokes expired session', () => {
    process.env.NODE_ENV = 'development';
    const run = vi.fn();
    const db = {
      prepare: vi.fn((sql) => {
        if (sql.includes('WHERE s.token_hash = ?')) {
          return { get: vi.fn(() => ({
            session_id: 1,
            user_id: 9,
            csrf_token: 'abc',
            expires_at: '2000-01-01T00:00:00.000Z',
            absolute_expires_at: '2099-01-01T00:00:00.000Z',
            revoked_at: null,
            first_name: 'A', last_name: 'B', email: 'a@x.com', verified: 1, user_type: 'staff', access_rank: 50,
          })) };
        }
        return { run, get: vi.fn(), all: vi.fn(() => []) };
      }),
    };
    const req = new Request('http://localhost:3000/api/x', { headers: { cookie: `${SESSION_COOKIE_NAME}=tok` } });
    const auth = requireAccess(req, db, { requireCsrf: false });
    expect(auth.error.status).toBe(401);
    expect(run).toHaveBeenCalled();
  });

  test('requireAccess idle expiry boundary: valid at exact time, revoked after', () => {
    process.env.NODE_ENV = 'development';
    vi.useFakeTimers();
    const boundaryIso = '2026-03-05T00:00:00.000Z';
    const run = vi.fn();
    const db = {
      prepare: vi.fn((sql) => {
        if (sql.includes('WHERE s.token_hash = ?')) {
          return { get: vi.fn(() => ({
            session_id: 2,
            user_id: 9,
            csrf_token: 'abc',
            expires_at: boundaryIso,
            absolute_expires_at: '2026-03-06T00:00:00.000Z',
            revoked_at: null,
            first_name: 'A', last_name: 'B', email: 'a@x.com', verified: 1, user_type: 'staff', access_rank: 50,
          })) };
        }
        return { run, get: vi.fn(), all: vi.fn(() => []) };
      }),
    };

    vi.setSystemTime(new Date(boundaryIso));
    const req = new Request('http://localhost:3000/api/x', { headers: { cookie: `${SESSION_COOKIE_NAME}=tok` } });
    const atBoundary = requireAccess(req, db, { requireCsrf: false });
    expect(atBoundary.user.email).toBe('a@x.com');

    vi.setSystemTime(new Date('2026-03-05T00:00:00.001Z'));
    const afterBoundary = requireAccess(req, db, { requireCsrf: false });
    expect(afterBoundary.error.status).toBe(401);
    expect(run).toHaveBeenCalled();

    vi.useRealTimers();
  });

  test('cookie helpers set and clear cookies and token extraction works', () => {
    const response = { cookies: { set: vi.fn() } };
    applySessionCookies(response, 'token', 'csrf');
    clearSessionCookies(response);
    expect(response.cookies.set).toHaveBeenCalled();

    const req = new Request('http://localhost:3000/api/x', { headers: { cookie: `${SESSION_COOKIE_NAME}=abc` } });
    expect(getSessionTokenFromRequest(req)).toBe('abc');
  });

  test('revokeSessionByToken no-op/active path', () => {
    const run = vi.fn();
    const db = { prepare: vi.fn(() => ({ run })) };
    revokeSessionByToken(db, null);
    expect(run).not.toHaveBeenCalled();
    revokeSessionByToken(db, 'token');
    expect(run).toHaveBeenCalled();
  });
});
