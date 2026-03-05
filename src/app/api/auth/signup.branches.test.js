const prepareMock = vi.hoisted(() => vi.fn());
const sendSignupVerificationEmailMock = vi.hoisted(() => vi.fn());
const nowMock = vi.hoisted(() => vi.fn(() => new Date('2026-03-05T00:00:00.000Z')));

vi.mock('crypto', () => ({
  randomBytes: () => ({ toString: () => 'token123' }),
}));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    mailer: { sendSignupVerificationEmail: sendSignupVerificationEmailMock },
    clock: { now: nowMock },
  }),
}));

import { POST } from '@/app/api/auth/signup/route';

describe('/api/auth/signup POST branches', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    sendSignupVerificationEmailMock.mockReset();
    nowMock.mockClear();
    delete process.env.NODE_ENV;
  });

  test('rejects missing required fields', async () => {
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ first_name: 'A' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects invalid email format', async () => {
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', email: 'bad' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 409 for existing verified user', async () => {
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => ({ user_id: 3, verified: 1 }) };
      return { get: vi.fn(), run: vi.fn() };
    });
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', email: 'x@y.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  test('returns 400 for invalid phone number', async () => {
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => undefined };
      return { get: vi.fn(), run: vi.fn() };
    });
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', email: 'x@y.com', phone_number: '123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 500 when public user type missing', async () => {
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => undefined };
      if (sql.includes('SELECT user_type_id FROM user_type WHERE type = ?')) return { get: () => undefined };
      return { get: vi.fn(), run: vi.fn() };
    });
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', email: 'x@y.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  test('creates account with emailSent true', async () => {
    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) return { get: () => undefined };
      if (sql.includes('SELECT user_type_id FROM user_type WHERE type = ?')) return { get: () => ({ user_type_id: 9 }) };
      if (sql.includes('INSERT INTO user')) return { run: vi.fn() };
      return { get: vi.fn(), run: vi.fn() };
    });
    sendSignupVerificationEmailMock.mockResolvedValue(undefined);
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', email: 'x@y.com', phone_number: '1234567890' }),
    });
    const res = await POST(req);
    const payload = await res.json();
    expect(res.status).toBe(201);
    expect(payload.emailSent).toBe(true);
  });
});
