const prepareMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: vi.fn(),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,abc123'),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: () => ({ toString: () => 'abcdef123456' }),
  },
}));

import { POST } from '@/app/api/qr-codes/generate/route';

describe('/api/qr-codes/generate POST', () => {
  beforeEach(() => {
    prepareMock.mockReset();
  });

  test('returns 400 when qrType missing', async () => {
    const req = new Request('http://localhost:3000/api/qr-codes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns generated QR payload', async () => {
    prepareMock.mockReturnValue({ run: vi.fn(() => ({ lastInsertRowid: 5 })) });

    const req = new Request('http://localhost:3000/api/qr-codes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify({ qrType: 'survey' }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.qrCode.qrCodeKey).toContain('qr_');
  });
});
