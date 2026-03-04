import { registerAuditSubscriber } from './audit-subscriber';
import { registerMetricsSubscriber } from './metrics-subscriber';

let _registered = false;
let _teardownFns = [];

export function setupEventSubscribers(eventBus) {
  if (_registered) return;

  _teardownFns = [
    registerAuditSubscriber(eventBus),
    registerMetricsSubscriber(eventBus),
  ];

  _registered = true;
}

export function teardownEventSubscribers() {
  _teardownFns.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.error('[events] teardown failed:', error);
    }
  });
  _teardownFns = [];
  _registered = false;
}
