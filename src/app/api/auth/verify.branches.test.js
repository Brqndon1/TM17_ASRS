const prepareMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());
const hashPasswordMock = vi.hoisted(() => vi.fn(() => 'hashed_pw'));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    eventBus: { publish: publishMock },
    clock: { nowIso: () => '2026-03-05T00:00:00.000Z' },
  }),
}));

vi.mock('@/lib/auth/passwords', () => ({ hashPassword: hashPasswordMock }));

import { GET, POST } from '@/app/api/auth/verify/route';

describe('/api/auth/verify branch coverage', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    publishMock.mockReset();
    hashPasswordMock.mockClear();
  });

  test('GET returns 404 for unknown token', async () => {
    prepareMock.mockReturnValue({ get: () => undefined });
    const res = await GET(new Request('http://localhost:3000/api/auth/verify?token=bad'));
    expect(res.status).toBe(404);
  });

  test('GET returns 410 for expired token', async () => {
    prepareMock.mockReturnValue({ get: () => ({ token_expires_at: '2000-01-01T00:00:00.000Z' }) });
    const res = await GET(new Request('http://localhost:3000/api/auth/verify?token=expired'));
    expect(res.status).toBe(410);
  });

  test('GET returns success for valid token', async () => {
    prepareMock.mockReturnValue({ get: () => ({ first_name: 'A', email: 'a@x.com', token_expires_at: '2099-01-01T00:00:00.000Z' }) });
    const res = await GET(new Request('http://localhost:3000/api/auth/verify?token=ok'));
    expect(res.status).toBe(200);
  });

  test('POST returns 400 when token/password missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('POST returns 404 for invalid token', async () => {
    prepareMock.mockReturnValue({ get: () => undefined, run: vi.fn() });
    const req = new Request('http://localhost:3000/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'bad', password: 'password1' }) });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  test('POST returns 410 for expired token', async () => {
    prepareMock.mockReturnValue({ get: () => ({ token_expires_at: '2000-01-01T00:00:00.000Z' }), run: vi.fn() });
    const req = new Request('http://localhost:3000/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'expired', password: 'password1' }) });
    const res = await POST(req);
    expect(res.status).toBe(410);
  });
});
