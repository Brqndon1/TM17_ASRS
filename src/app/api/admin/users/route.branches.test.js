const prepareMock = vi.hoisted(() => vi.fn());
const sendAdminInviteEmailMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock('crypto', () => ({ randomBytes: () => ({ toString: () => 'token123' }) }));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    mailer: { sendAdminInviteEmail: sendAdminInviteEmailMock },
    clock: { now: () => new Date('2026-03-05T00:00:00.000Z'), nowIso: () => '2026-03-05T00:00:00.000Z' },
    eventBus: { publish: publishMock },
  }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { email: 'admin@test.com', access_rank: 100 } }),
}));

import { GET, POST, PUT, DELETE } from '@/app/api/admin/users/route';

describe('/api/admin/users route branches', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    sendAdminInviteEmailMock.mockReset();
    publishMock.mockReset();
    delete process.env.NODE_ENV;
  });

  test('POST validates required fields/type/email', async () => {
    const req1 = new Request('http://localhost:3000/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect((await POST(req1)).status).toBe(400);

    const req2 = new Request('http://localhost:3000/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ first_name:'A', last_name:'B', email:'a@x.com', user_type:'public' }) });
    expect((await POST(req2)).status).toBe(400);

    const req3 = new Request('http://localhost:3000/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ first_name:'A', last_name:'B', email:'bad', user_type:'staff' }) });
    expect((await POST(req3)).status).toBe(400);
  });

  test('POST handles existing verified and existing unverified', async () => {
    const makeReq = () => new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ first_name:'A', last_name:'B', email:'a@x.com', user_type:'staff' }),
    });

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => ({ user_id: 2, verified: 1 }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await POST(makeReq())).status).toBe(409);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => ({ user_id: 2, verified: 0 }) };
      if (sql.includes('UPDATE user SET verification_token')) return { run: vi.fn() };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    sendAdminInviteEmailMock.mockResolvedValue(undefined);
    const res2 = await POST(makeReq());
    const payload2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(payload2.success).toBe(true);
  });

  test('POST creates new user and validates phone/typeRow', async () => {
    const base = { first_name:'A', last_name:'B', email:'a@x.com', user_type:'staff' };
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => undefined };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    const badPhoneReq = new Request('http://localhost:3000/api/admin/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...base, phone_number:'123' })});
    expect((await POST(badPhoneReq)).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => undefined };
      if (sql.includes('SELECT user_type_id FROM user_type WHERE type = ?')) return { get: () => undefined };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    const noTypeReq = new Request('http://localhost:3000/api/admin/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(base)});
    expect((await POST(noTypeReq)).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => undefined };
      if (sql.includes('SELECT user_type_id FROM user_type WHERE type = ?')) return { get: () => ({ user_type_id: 7 }) };
      if (sql.includes('INSERT INTO user')) return { run: () => ({ lastInsertRowid: 10 }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    sendAdminInviteEmailMock.mockRejectedValue(new Error('smtp down'));
    const okReq = new Request('http://localhost:3000/api/admin/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(base)});
    const okRes = await POST(okReq);
    expect(okRes.status).toBe(201);
  });

  test('PUT and DELETE cover missing/not-found/self/success', async () => {
    const putMissingReq = new Request('http://localhost:3000/api/admin/users', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
    expect((await PUT(putMissingReq)).status).toBe(400);

    const putBadRoleReq = new Request('http://localhost:3000/api/admin/users', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id:2, new_role:'x' }) });
    expect((await PUT(putBadRoleReq)).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, email FROM user WHERE user_id = ?')) return { get: () => undefined };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await PUT(new Request('http://localhost:3000/api/admin/users', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id:2, new_role:'staff' }) }))).status).toBe(404);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, email FROM user WHERE user_id = ?')) return { get: () => ({ user_id:2, email:'admin@test.com' }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await PUT(new Request('http://localhost:3000/api/admin/users', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id:2, new_role:'staff' }) }))).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, email FROM user WHERE user_id = ?')) return { get: () => ({ user_id:2, email:'user@test.com' }) };
      if (sql.includes('SELECT user_type_id FROM user_type WHERE type = ?')) return { get: () => ({ user_type_id: 8 }) };
      if (sql.includes('UPDATE user SET user_type_id')) return { run: vi.fn() };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await PUT(new Request('http://localhost:3000/api/admin/users', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id:2, new_role:'staff' }) }))).status).toBe(200);

    expect((await DELETE(new Request('http://localhost:3000/api/admin/users', { method:'DELETE' }))).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT email FROM user WHERE user_id = ?')) return { get: () => undefined };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await DELETE(new Request('http://localhost:3000/api/admin/users?user_id=2', { method:'DELETE' }))).status).toBe(404);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT email FROM user WHERE user_id = ?')) return { get: () => ({ email:'admin@test.com' }) };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await DELETE(new Request('http://localhost:3000/api/admin/users?user_id=2', { method:'DELETE' }))).status).toBe(400);

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT email FROM user WHERE user_id = ?')) return { get: () => ({ email:'other@test.com' }) };
      if (sql.includes('DELETE FROM user WHERE user_id = ?')) return { run: vi.fn() };
      return { get: vi.fn(), run: vi.fn(), all: vi.fn(() => []) };
    });
    expect((await DELETE(new Request('http://localhost:3000/api/admin/users?user_id=2', { method:'DELETE' }))).status).toBe(200);
  });

  test('GET handles internal error', async () => {
    prepareMock.mockImplementation(() => { throw new Error('db fail'); });
    const res = await GET(new Request('http://localhost:3000/api/admin/users'));
    expect(res.status).toBe(500);
  });
});
