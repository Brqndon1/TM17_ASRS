const prepareMock = vi.hoisted(() => vi.fn());
const sendSignupVerificationEmailMock = vi.hoisted(() => vi.fn());
const nowMock = vi.hoisted(() => vi.fn(() => new Date('2026-03-05T00:00:00.000Z')));

vi.mock('crypto', () => ({
  randomBytes: () => ({
    toString: () => 'token123',
  }),
}));

vi.mock('@/lib/container/service-container', () => ({
  getServiceContainer: () => ({
    db: { prepare: prepareMock },
    mailer: { sendSignupVerificationEmail: sendSignupVerificationEmailMock },
    clock: { now: nowMock },
  }),
}));

import { POST } from '@/app/api/auth/signup/route';

describe('/api/auth/signup POST', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    prepareMock.mockReset();
    sendSignupVerificationEmailMock.mockReset();
    nowMock.mockClear();
    delete process.env.NODE_ENV;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('creates account even when email delivery fails and returns verification URL in non-production', async () => {
    sendSignupVerificationEmailMock.mockRejectedValue(new Error('smtp unavailable'));

    prepareMock.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, verified FROM user WHERE email = ?')) {
        return { get: vi.fn(() => undefined) };
      }
      if (sql.includes('SELECT user_type_id FROM user_type WHERE type = ?')) {
        return { get: vi.fn(() => ({ user_type_id: 10 })) };
      }
      if (sql.includes('INSERT INTO user')) {
        return { run: vi.fn(() => ({ lastInsertRowid: 42 })) };
      }
      return { get: vi.fn(), run: vi.fn() };
    });

    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Alex',
        last_name: 'Smith',
        email: 'ALEX@Example.com ',
      }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.emailSent).toBe(false);
    expect(payload.verificationUrl).toContain('/verify?token=token123');
    expect(sendSignupVerificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alex@example.com', firstName: 'Alex', token: 'token123' })
    );
  });
});
