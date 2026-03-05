const prepareMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({ db: { prepare: prepareMock } }),
}));

import { GET } from '@/app/api/reports/[id]/route';

describe('/api/reports/:id GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
  });

  test('returns 404 when report does not exist', async () => {
    prepareMock.mockReturnValue({ get: vi.fn(() => undefined) });

    const res = await GET(new Request('http://localhost:3000/api/reports/2'), {
      params: Promise.resolve({ id: '2' }),
    });

    expect(res.status).toBe(404);
  });
});
