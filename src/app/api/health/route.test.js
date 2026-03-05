const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: { prepare: prepareMock },
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

import { GET } from '@/app/api/health/route';

describe('/api/health GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('returns ok when db query succeeds', async () => {
    prepareMock.mockReturnValue({ get: vi.fn(() => ({ now: '2026-03-05 10:00:00' })) });

    const res = await GET();
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.status).toBe('ok');
    expect(payload.database).toBe('connected');
    expect(initializeDatabaseMock).toHaveBeenCalled();
  });
});
