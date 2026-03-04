# Design Patterns in ASRS

## Adapter Pattern

### Backend adapters
- `src/lib/adapters/initiative-adapter.js`
- `src/lib/adapters/report-adapter.js`

Purpose:
- Convert DB rows and request payloads into stable DTO/input shapes.
- Keep API route handlers focused on control flow rather than field-level mapping.

### Frontend adapters
- `src/lib/adapters/report-api-adapter.js`
- `src/lib/adapters/survey-template-adapter.js`

Purpose:
- Normalize API response contracts into component-friendly view models.
- Avoid repeated parsing and fallback logic in pages/components.

## Singleton Pattern

### Backend service container
- `src/lib/container/service-container.js`

Provides a single access point for:
- DB (with lazy initialization)
- Mailer methods
- Report engine functions
- Event bus
- Clock helpers

### Frontend auth store
- `src/lib/auth/auth-store.js`
- `src/lib/auth/use-auth-store.js`

Provides one shared auth source for UI:
- Read/write current user
- Storage hydration/persistence
- Subscriber notifications for auth changes

## Observer Pattern

### Backend domain events
- `src/lib/events/event-bus.js`
- `src/lib/events/event-types.js`
- `src/lib/events/subscribers/*`

Current event publications:
- `report.created`
- `user.invited`
- `user.verified`
- `qr.scanned`

Current subscribers:
- Audit subscriber (structured console info)
- Metrics subscriber (in-memory counters)

### Frontend UI events
- `src/lib/events/ui-event-bus.js`

Current usage:
- Auth store publishes `auth.changed`
- Report creation publishes `report.updated`
- Reporting page listens for `report.updated` and refreshes report map
