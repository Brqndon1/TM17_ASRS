const prepareMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db.js', () => ({
  default: { prepare: prepareMock },
}));

import { GET } from '@/app/api/surveys/templates/[id]/route';

describe('/api/surveys/templates/:id GET', () => {
  beforeEach(() => {
    prepareMock.mockReset();
  });

  test('returns 400 when template id missing', async () => {
    const res = await GET(new Request('http://localhost:3000/api/surveys/templates/'), {
      params: Promise.resolve({ id: '' }),
    });

    expect(res.status).toBe(400);
  });

  test('returns 404 when template not found', async () => {
    prepareMock.mockReturnValue({ get: vi.fn(() => undefined), all: vi.fn(() => []) });

    const res = await GET(new Request('http://localhost:3000/api/surveys/templates/123'), {
      params: Promise.resolve({ id: '123' }),
    });

    expect(res.status).toBe(404);
  });
});
