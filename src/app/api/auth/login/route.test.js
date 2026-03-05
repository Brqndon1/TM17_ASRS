const prepareMock = vi.hoisted(() => vi.fn());
const verifyPasswordMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn(() => ({ token: 't1', csrfToken: 'c1' })));
const applySessionCookiesMock = vi.hoisted(() => vi.fn((res) => res));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({ db: { prepare: prepareMock } }),
}));

vi.mock('@/lib/auth/passwords', () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  createSession: createSessionMock,
  applySessionCookies: applySessionCookiesMock,
}));

import { POST } from '@/app/api/auth/login/route';

describe('/api/auth/login POST', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    verifyPasswordMock.mockReset();
    createSessionMock.mockClear();
    applySessionCookiesMock.mockClear();
  });

  test('returns 400 when email/password missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns success for valid credentials and verified user', async () => {
    prepareMock.mockReturnValue({
      get: vi.fn(() => ({
        user_id: 7,
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        password: 'hashed',
        verified: 1,
        user_type: 'admin',
      })),
    });
    verifyPasswordMock.mockReturnValue(true);

    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'pw123456' }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createSessionMock).toHaveBeenCalled();
    expect(applySessionCookiesMock).toHaveBeenCalled();
  });
});
