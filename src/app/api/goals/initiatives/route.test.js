const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  default: { prepare: prepareMock },
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

import { GET } from '@/app/api/goals/initiatives/route';

describe('/api/goals/initiatives GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('returns initiatives for goals dropdown', async () => {
    prepareMock.mockReturnValue({ all: vi.fn(() => [{ initiative_id: 1, initiative_name: 'Init A' }]) });

    const res = await GET();
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.initiatives).toHaveLength(1);
  });
});
