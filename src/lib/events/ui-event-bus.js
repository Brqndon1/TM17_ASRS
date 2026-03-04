class UiEventBus {
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
    if (!set) return;

    for (const handler of set) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[ui-events] handler failed for ${eventName}:`, error);
      }
    }
  }
}

let _instance = null;

export function getUiEventBus() {
  if (!_instance) {
    _instance = new UiEventBus();
  }
  return _instance;
}

export { UiEventBus };
