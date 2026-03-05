vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => JSON.stringify({
      trends: {
        '12': [
          { id: 't1', enabledDisplay: true },
          { id: 't2', enabledDisplay: false },
        ],
      },
    })),
  },
}));

import { GET } from '@/app/api/trends/[id]/route';

describe('/api/trends/:id GET', () => {
  test('returns only enabledDisplay trends', async () => {
    const res = await GET(new Request('http://localhost:3000/api/trends/12'), {
      params: Promise.resolve({ id: '12' }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.trends).toHaveLength(1);
    expect(payload.trends[0].id).toBe('t1');
  });
});
