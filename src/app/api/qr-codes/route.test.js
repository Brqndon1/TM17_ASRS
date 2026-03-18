const prepareMock = vi.hoisted(() => vi.fn());
const requireAccessMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: requireAccessMock,
}));

import { GET } from '@/app/api/qr-codes/route';

describe('/api/qr-codes GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    requireAccessMock.mockReset();
    initializeDatabaseMock.mockClear();
  });

  test('returns 401 when user is unauthorized', async () => {
    requireAccessMock.mockReturnValue({ error: new Response(null, { status: 401 }) });

    const req = new Request('http://localhost:3000/api/qr-codes');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  test('returns transformed QR code list with stats', async () => {
    requireAccessMock.mockReturnValue({ user: { user_id: 1, access_rank: 100 } });

    prepareMock.mockReturnValue({
      all: vi.fn(() => [
        {
          qr_code_id: 10,
          qr_code_key: 'qr_abc',
          qr_type: 'report',
          target_id: '7',
          target_url: 'https://example.com/report/7',
          description: 'test',
          created_at: '2026-03-01T00:00:00.000Z',
          expires_at: null,
          is_active: 1,
          template_title: null,
          total_scans: 4,
          unique_ips: 2,
          conversions: 1,
          last_scanned_at: '2026-03-02T00:00:00.000Z',
        },
      ]),
    });

    const req = new Request('http://localhost:3000/api/qr-codes?scope=report');
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.qrCodes).toHaveLength(1);
    expect(payload.qrCodes[0].stats.conversionRate).toBe(25);
    expect(payload.qrCodes[0].isActive).toBe(true);
  });
});
