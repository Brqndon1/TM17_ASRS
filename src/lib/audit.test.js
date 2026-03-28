import { logAudit } from '@/lib/audit';

describe('logAudit helper', () => {
  let db;
  let runMock;

  beforeEach(() => {
    runMock = vi.fn();
    db = { prepare: vi.fn(() => ({ run: runMock })) };
  });

  // ── Core functionality ──

  test('inserts a full audit entry with all fields', () => {
    logAudit(db, {
      event: 'goal.created',
      userEmail: 'admin@test.com',
      targetType: 'goal',
      targetId: '42',
      reasonType: 'manual',
      reasonText: 'Initial setup',
      payload: { goal_name: 'Test Goal' },
    });

    expect(db.prepare).toHaveBeenCalledOnce();
    expect(runMock).toHaveBeenCalledWith(
      'goal.created',
      'admin@test.com',
      'goal',
      '42',
      'manual',
      'Initial setup',
      '{"goal_name":"Test Goal"}',
    );
  });

  test('handles missing optional fields with null defaults', () => {
    logAudit(db, {
      event: 'goal.deleted',
      userEmail: 'admin@test.com',
    });

    expect(runMock).toHaveBeenCalledWith(
      'goal.deleted',
      'admin@test.com',
      null,   // targetType
      null,   // targetId
      null,   // reasonType
      null,   // reasonText
      null,   // payload
    );
  });

  // ── Edge cases: targetId coercion ──

  test('converts numeric targetId to string', () => {
    logAudit(db, {
      event: 'goal.updated',
      userEmail: 'admin@test.com',
      targetType: 'goal',
      targetId: 99,
    });

    expect(runMock.mock.calls[0][3]).toBe('99');
  });

  test('converts targetId 0 to string "0" (not null)', () => {
    logAudit(db, {
      event: 'goal.updated',
      userEmail: 'admin@test.com',
      targetId: 0,
    });

    expect(runMock.mock.calls[0][3]).toBe('0');
  });

  test('treats undefined targetId as null', () => {
    logAudit(db, {
      event: 'goal.updated',
      userEmail: 'admin@test.com',
      targetId: undefined,
    });

    expect(runMock.mock.calls[0][3]).toBeNull();
  });

  test('treats null targetId as null', () => {
    logAudit(db, {
      event: 'goal.updated',
      userEmail: 'admin@test.com',
      targetId: null,
    });

    expect(runMock.mock.calls[0][3]).toBeNull();
  });

  // ── Edge cases: payload serialization ──

  test('serializes nested payload objects to JSON', () => {
    logAudit(db, {
      event: 'goal.updated',
      userEmail: 'admin@test.com',
      payload: {
        changes: {
          target_value: { from: 50, to: 100 },
          goal_name: { from: 'Old', to: 'New' },
        },
      },
    });

    const payloadArg = runMock.mock.calls[0][6];
    const parsed = JSON.parse(payloadArg);
    expect(parsed.changes.target_value.from).toBe(50);
    expect(parsed.changes.target_value.to).toBe(100);
  });

  test('handles empty payload object as JSON "{}"', () => {
    logAudit(db, {
      event: 'report.deleted',
      userEmail: 'admin@test.com',
      payload: {},
    });

    expect(runMock.mock.calls[0][6]).toBe('{}');
  });

  test('handles payload with special characters', () => {
    logAudit(db, {
      event: 'initiative.created',
      userEmail: 'admin@test.com',
      payload: { name: 'Test "Initiative" with <html> & special chars' },
    });

    const payloadArg = runMock.mock.calls[0][6];
    const parsed = JSON.parse(payloadArg);
    expect(parsed.name).toBe('Test "Initiative" with <html> & special chars');
  });

  test('handles payload with unicode characters', () => {
    logAudit(db, {
      event: 'initiative.created',
      userEmail: 'admin@test.com',
      payload: { name: 'Инициатива тест 🎯' },
    });

    const payloadArg = runMock.mock.calls[0][6];
    const parsed = JSON.parse(payloadArg);
    expect(parsed.name).toBe('Инициатива тест 🎯');
  });

  test('handles null payload as null (not "null")', () => {
    logAudit(db, {
      event: 'goal.deleted',
      userEmail: 'admin@test.com',
      payload: null,
    });

    expect(runMock.mock.calls[0][6]).toBeNull();
  });

  // ── Edge cases: userEmail ──

  test('handles undefined userEmail as null', () => {
    logAudit(db, {
      event: 'goal.created',
      userEmail: undefined,
    });

    expect(runMock.mock.calls[0][1]).toBeNull();
  });

  // ── Error resilience ──

  test('does not throw if db.prepare throws', () => {
    const badDb = {
      prepare: vi.fn(() => { throw new Error('DB connection lost'); }),
    };

    expect(() => {
      logAudit(badDb, { event: 'goal.created', userEmail: 'a@b.com' });
    }).not.toThrow();
  });

  test('does not throw if db.prepare().run throws', () => {
    const badDb = {
      prepare: vi.fn(() => ({
        run: vi.fn(() => { throw new Error('SQLITE_FULL: database disk image is full'); }),
      })),
    };

    expect(() => {
      logAudit(badDb, { event: 'goal.created', userEmail: 'a@b.com' });
    }).not.toThrow();
  });

  test('logs error message to console when db write fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badDb = {
      prepare: vi.fn(() => { throw new Error('DB error'); }),
    };

    logAudit(badDb, { event: 'goal.created', userEmail: 'a@b.com' });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[audit] Failed to write audit log entry:',
      'DB error'
    );
    consoleSpy.mockRestore();
  });

  // ── Minimum viable entry ──

  test('works with only event field (absolute minimum)', () => {
    logAudit(db, { event: 'system.startup' });

    expect(runMock).toHaveBeenCalledWith(
      'system.startup',
      null, null, null, null, null, null,
    );
  });
});
