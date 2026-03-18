const alertDbMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@/lib/db-alerts', () => ({
  alertDb: alertDbMock,
}));

import { POST } from '@/app/api/debug/alert/route';

describe('/api/debug/alert POST', () => {
  beforeEach(() => {
    alertDbMock.mockClear();
  });

  test('returns success for valid JSON payload', async () => {
    const req = new Request('http://localhost:3000/api/debug/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'boom' }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(alertDbMock).toHaveBeenCalledTimes(1);
  });

  test('handles invalid JSON body gracefully', async () => {
    const req = new Request('http://localhost:3000/api/debug/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not-json',
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(alertDbMock).toHaveBeenCalledTimes(1);
  });
});
