class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  subscribe(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    const set = this.handlers.get(eventName);
    set.add(handler);

    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }

  publish(eventName, payload) {
    const set = this.handlers.get(eventName);
    if (!set || set.size === 0) return;

    for (const handler of set) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[events] handler failed for ${eventName}:`, error);
      }
    }
  }
}

let _instance = null;

export function getEventBus() {
  if (!_instance) {
    _instance = new EventBus();
  }
  return _instance;
}

export { EventBus };
