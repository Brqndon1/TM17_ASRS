const prepareMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({ db: { prepare: prepareMock } }),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  requireAccess: () => ({ user: { user_id: 1, access_rank: 100 } }),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: readFileMock,
    writeFile: writeFileMock,
  },
}));

import { GET, POST } from '@/app/api/initiatives/route';

describe('/api/initiatives', () => {
  beforeEach(() => {
    prepareMock.mockReset();
    readFileMock.mockReset();
    writeFileMock.mockReset();
  });

  test('GET returns initiatives', async () => {
    prepareMock.mockReturnValue({ all: vi.fn(() => [{ initiative_id: 1, initiative_name: 'Init' }]) });

    const res = await GET();
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.initiatives).toHaveLength(1);
  });

  test('POST requires name field', async () => {
    const req = new Request('http://localhost:3000/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'x' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
