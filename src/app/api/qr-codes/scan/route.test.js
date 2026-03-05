const prepareMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    eventBus: { publish: publishMock },
    clock: { nowIso: () => '2026-03-05T00:00:00.000Z' },
  }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

import { GET, POST } from '@/app/api/qr-codes/scan/route';

describe('/api/qr-codes/scan', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    publishMock.mockReset();
  });

  test('POST requires qrCodeKey', async () => {
    const req = new Request('http://localhost:3000/api/qr-codes/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('GET requires qrCodeKey query parameter', async () => {
    const res = await GET(new Request('http://localhost:3000/api/qr-codes/scan'));
    expect(res.status).toBe(400);
  });
});
