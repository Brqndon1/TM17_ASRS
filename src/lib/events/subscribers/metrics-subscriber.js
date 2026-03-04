const counters = new Map();

function increment(eventName) {
  counters.set(eventName, (counters.get(eventName) || 0) + 1);
}

export function getEventCounters() {
  return Object.fromEntries(counters.entries());
}

export function registerMetricsSubscriber(eventBus) {
  const unsubscribeFns = [];

  const subscribe = (eventName) => {
    const unsubscribe = eventBus.subscribe(eventName, () => {
      increment(eventName);
    });
    unsubscribeFns.push(unsubscribe);
  };

  subscribe('report.created');
  subscribe('user.invited');
  subscribe('user.verified');
  subscribe('qr.scanned');

  return () => {
    unsubscribeFns.forEach((fn) => fn());
  };
}
