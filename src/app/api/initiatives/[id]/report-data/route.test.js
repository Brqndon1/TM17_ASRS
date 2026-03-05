const prepareMock = vi.hoisted(() => vi.fn());
const initializeDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { prepare: prepareMock },
  initializeDatabase: initializeDatabaseMock,
}));

vi.mock('@/lib/query-helpers', () => ({
  queryTableData: vi.fn(() => []),
}));

import { GET } from '@/app/api/initiatives/[id]/report-data/route';

describe('/api/initiatives/:id/report-data GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    initializeDatabaseMock.mockReset();
  });

  test('returns 404 when initiative does not exist', async () => {
    prepareMock.mockReturnValue({ get: vi.fn(() => undefined) });

    const res = await GET(new Request('http://localhost:3000/api/initiatives/99/report-data'), {
      params: Promise.resolve({ id: '99' }),
    });

    expect(res.status).toBe(404);
  });
});
