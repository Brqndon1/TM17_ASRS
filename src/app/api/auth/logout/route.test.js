const revokeSessionByTokenMock = vi.hoisted(() => vi.fn());
const clearSessionCookiesMock = vi.hoisted(() => vi.fn((res) => res));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({ db: { prepare: vi.fn() } }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  getSessionTokenFromRequest: () => 'session-token',
  revokeSessionByToken: revokeSessionByTokenMock,
  clearSessionCookies: clearSessionCookiesMock,
}));

import { POST } from '@/app/api/auth/logout/route';

describe('/api/auth/logout POST', () => {
  beforeEach(() => {
    revokeSessionByTokenMock.mockReset();
    clearSessionCookiesMock.mockClear();
  });

  test('revokes current session and clears cookies', async () => {
    const req = new Request('http://localhost:3000/api/auth/logout', { method: 'POST' });
    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(revokeSessionByTokenMock).toHaveBeenCalled();
    expect(clearSessionCookiesMock).toHaveBeenCalled();
  });
});
