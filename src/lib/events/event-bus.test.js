import { EventBus } from '@/lib/events/event-bus';

describe('event-bus', () => {
  test('notifies subscribers and supports unsubscribe', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe('test.event', handler);
    bus.publish('test.event', { ok: true });
    expect(handler).toHaveBeenCalledWith({ ok: true });

    unsubscribe();
    bus.publish('test.event', { ok: false });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('isolates subscriber errors', () => {
    const bus = new EventBus();
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.subscribe('test.error', bad);
    bus.subscribe('test.error', good);

    bus.publish('test.error', { value: 1 });

    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalledWith({ value: 1 });
    consoleSpy.mockRestore();
  });
});
