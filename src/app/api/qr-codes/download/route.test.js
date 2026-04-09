const prepareMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: vi.fn(),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requirePermission: () => ({ user: { user_id: 1, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
  requireAuth: () => ({ user: { user_id: 1, permissions: ['surveys.take', 'initiatives.manage', 'reporting.view', 'reports.create', 'forms.create', 'surveys.distribute', 'goals.manage', 'performance.view', 'budgets.manage', 'conflicts.manage', 'users.manage', 'audit.view', 'import.manage'] } }),
}));

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn(async () => Buffer.from('pngdata')),
    toString: vi.fn(async () => '<svg></svg>'),
  },
}));

import { GET } from '@/app/api/qr-codes/download/route';

describe('/api/qr-codes/download GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
  });

  test('returns 400 without qrCodeKey', async () => {
    const res = await GET(new Request('http://localhost:3000/api/qr-codes/download'));
    expect(res.status).toBe(400);
  });

  test('returns image when qr code exists', async () => {
    prepareMock.mockReturnValue({
      get: vi.fn(() => ({
        qr_code_id: 1,
        qr_code_key: 'qr_abc',
        qr_type: 'survey',
        target_url: 'http://localhost:3000/survey?qr=qr_abc',
        description: 'survey',
      })),
    });

    const res = await GET(new Request('http://localhost:3000/api/qr-codes/download?qrCodeKey=qr_abc'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
