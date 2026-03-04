import db, { initializeDatabase } from '@/lib/db';
import { sendAdminInviteEmail, sendSignupVerificationEmail } from '@/lib/email';
import { computeTrendData, processReportData, validateTrendConfig } from '@/lib/report-engine';
import { getEventBus } from '@/lib/events/event-bus';
import { setupEventSubscribers } from '@/lib/events/subscribers';

class ServiceContainer {
  constructor() {
    this._eventBus = getEventBus();
    setupEventSubscribers(this._eventBus);
    this.clock = {
      now: () => new Date(),
      nowIso: () => new Date().toISOString(),
      todayIsoDate: () => new Date().toISOString().slice(0, 10),
    };
  }

  get db() {
    initializeDatabase();
    return db;
  }

  get eventBus() {
    return this._eventBus;
  }

  get mailer() {
    return {
      sendSignupVerificationEmail,
      sendAdminInviteEmail,
    };
  }

  get reportEngine() {
    return {
      computeTrendData,
      processReportData,
      validateTrendConfig,
    };
  }

  static getInstance() {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
}

export function getServiceContainer() {
  return ServiceContainer.getInstance();
}

export { ServiceContainer };
