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
  subscribe('goal.edit.conflict');

  return () => {
    unsubscribeFns.forEach((fn) => fn());
  };
}
