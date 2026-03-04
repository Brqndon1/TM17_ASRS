# Design Pattern Implementation Summary (Sprint 4)

## Overview
In this update, I implemented three design patterns in the ASRS codebase:

1. Adapter
2. Singleton
3. Observer

The goal was to make the code easier to maintain, reduce duplicated logic, and make future features safer to add.

I also kept the behavior of the app mostly the same for users, while reorganizing how the code is structured internally.

## What Changed, Why, and Effect

## 1) Adapter Pattern

### What changed
I added adapter files to convert raw data into clean, consistent shapes.

New adapter files:
- `src/lib/adapters/initiative-adapter.js`
- `src/lib/adapters/report-adapter.js`
- `src/lib/adapters/report-api-adapter.js`
- `src/lib/adapters/survey-template-adapter.js`
- `src/lib/adapters/index.js`

I then updated routes and pages to use these adapters.

Updated files:
- `src/app/api/initiatives/route.js`
- `src/app/api/reports/route.js`
- `src/app/api/reports/[id]/route.js`
- `src/app/reporting/page.js`
- `src/app/survey/page.js`

### Why
Before this change, a lot of routes and pages were doing manual JSON parsing and field remapping inline. That made logic repetitive and error-prone.

### Effect
- Data mapping is now centralized in adapter files.
- API and UI code is cleaner and easier to read.
- If response shape changes later, we can update one adapter instead of many pages/routes.

## 2) Singleton Pattern

### What changed
I created one shared backend service container and one shared frontend auth store.

New singleton-related files:
- `src/lib/container/service-container.js`
- `src/lib/auth/auth-store.js`
- `src/lib/auth/use-auth-store.js`

Then I updated pages/components/routes to use these shared single instances.

Updated files:
- `src/components/Header.js`
- `src/app/page.js`
- `src/app/login/page.js`
- `src/app/admin/users/page.js`
- `src/app/api/auth/login/route.js`
- `src/app/api/auth/signup/route.js`
- `src/app/api/auth/verify/route.js`
- `src/app/api/admin/users/route.js`
- `src/app/api/initiatives/route.js`
- `src/app/api/reports/route.js`
- `src/app/api/reports/[id]/route.js`
- `src/app/api/qr-codes/scan/route.js`

### Why
Before this change:
- Auth state was read from `localStorage` in many places.
- Backend routes imported dependencies directly in many different ways.

That causes inconsistent behavior and duplicated code.

### Effect
- There is now one source of truth for frontend auth state.
- Backend routes get shared services (db, mailer, report engine, event bus) through one container.
- This improves consistency and makes dependency management cleaner.

## 3) Observer Pattern

### What changed
I added an event system on backend and frontend so features can react to events without hard-coupling everything together.

New observer/event files:
- `src/lib/events/event-types.js`
- `src/lib/events/event-bus.js`
- `src/lib/events/ui-event-bus.js`
- `src/lib/events/subscribers/audit-subscriber.js`
- `src/lib/events/subscribers/metrics-subscriber.js`
- `src/lib/events/subscribers/index.js`

I published events from core actions in API routes.

Updated files:
- `src/app/api/reports/route.js` (publishes `report.created`)
- `src/app/api/admin/users/route.js` (publishes `user.invited`)
- `src/app/api/auth/verify/route.js` (publishes `user.verified`)
- `src/app/api/qr-codes/scan/route.js` (publishes `qr.scanned`)
- `src/app/report-creation/page.js` (publishes UI `report.updated`)
- `src/app/reporting/page.js` (subscribes to `report.updated` and refreshes)

### Why
Before this change, side effects (like logging or follow-up actions) were mixed directly inside route logic.

### Effect
- Core route logic is more focused.
- Extra behavior can be added through subscribers/listeners.
- Future extensions (analytics, notifications, audit) are easier to add with less route editing.

## Other Important File Changes

### UI/auth consistency and navigation
- `src/components/Header.js` was rewritten to use shared auth store.
- `src/app/login/page.js` now writes auth state through the store.
- `src/app/page.js` now reads auth state from the store for route visibility.

### Reporting flow improvements
- `src/app/reporting/page.js` now uses report adapters and UI observer refresh.
- `src/app/report-creation/page.js` now emits a report update event after generation.

### Survey template normalization
- `src/app/survey/page.js` now normalizes template payloads through the survey template adapter.

## Tests Added/Updated

New tests:
- `src/lib/adapters/report-api-adapter.test.js`
- `src/lib/adapters/survey-template-adapter.test.js`
- `src/lib/events/event-bus.test.js`

Existing tests now pass, including the previous admin-users mismatch case.

## Validation Results
- `npm test` passed (`19/19` tests).
- `npm run build` passed.

Note: build logs still show existing DB initialization warnings from old migration logic in `src/lib/db.js` (not introduced by this pattern refactor).

## Documentation Added
- `docs/architecture/patterns.md`

This doc explains how Adapter, Singleton, and Observer are organized in the project.

## Final Outcome
This refactor did not focus on adding a new user-facing feature. Instead, it improved architecture quality:

- less duplicated code
- cleaner boundaries
- more consistent data flow
- easier testing
- easier future development

From a software engineering perspective, the system is now more maintainable and easier to scale in future sprints.
