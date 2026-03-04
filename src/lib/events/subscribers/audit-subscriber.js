export function registerAuditSubscriber(eventBus) {
  const unsubscribeFns = [];

  const subscribe = (eventName) => {
    const unsubscribe = eventBus.subscribe(eventName, (payload) => {
      console.info('[audit]', eventName, payload);
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
