const prepareMock = vi.hoisted(() => vi.fn());
const hashPasswordMock = vi.hoisted(() => vi.fn(() => 'hashed_pw'));
const publishMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    eventBus: { publish: publishMock },
    clock: { nowIso: () => '2026-03-05T00:00:00.000Z' },
  }),
}));

vi.mock('@/lib/auth/passwords', () => ({
  hashPassword: hashPasswordMock,
}));

import { GET, POST } from '@/app/api/auth/verify/route';

describe('/api/auth/verify', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    publishMock.mockReset();
    hashPasswordMock.mockClear();
  });

  test('GET returns 400 when token missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/verify');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test('POST returns 400 for short password', async () => {
    const req = new Request('http://localhost:3000/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'abc', password: 'short' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('POST returns 400 for whitespace-only password', async () => {
    const req = new Request('http://localhost:3000/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'abc', password: '        ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('POST verifies account when token is valid', async () => {
    const tokenLookup = vi.fn(() => ({
      user_id: 11,
      first_name: 'Staff',
      email: 'staff@test.com',
      token_expires_at: '2099-01-01T00:00:00.000Z',
    }));
    const updateRun = vi.fn();

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('WHERE verification_token = ?')) return { get: tokenLookup };
      if (sql.includes('UPDATE user')) return { run: updateRun };
      return { get: vi.fn(), run: vi.fn() };
    });

    const req = new Request('http://localhost:3000/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'good-token', password: 'goodpass1' }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(updateRun).toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalled();
  });
});
