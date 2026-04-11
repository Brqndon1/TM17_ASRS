# ASRS Project — System Overview (code-backed)

This file describes the runnable web application (what is deployed and run) and points to the source files that implement features.

Important: the runtime website is the code under `src/` and `public/` (plus configs like `package.json` and `next.config.mjs`). The `docs/` and `artifacts/` folders are documentation and sprint deliverables — they are not required to build/run the app unless explicitly referenced by code.

## Purpose
ASRS is a web application for managing initiatives, distributing and collecting surveys, generating reports, and sharing results (QR codes, downloadable exports) for an educational organization.

## High-level feature summary
- Initiatives: create/manage initiatives (attributes, questions, settings) that drive surveys and reports.
- Reporting: define, generate and snapshot reports per-initiative; supports filters, sorts, trend-config and optional AI insights.
- QR Code distribution: generate QR codes for surveys/reports, download PNG/SVG, and track scans and conversions.
- Authentication & permissions: session-based auth with role/permission checks (placeholders in some routes for stricter checks).
- Artifact & exports: generate downloadable CSV/PDF/PNG assets and bundle artifacts for sharing or archival.
- Background processing & events: long-running report generation, export jobs, and domain events (e.g., `report.created`, `qr.scanned`).

## Where to look (non-technical)
- UI (what users see): the pages and components are under `src/app/` and `src/components/` — reporting pages, survey pages, QR manager, and sharing tools live here.
- Server endpoints (what the UI talks to): `src/app/api/` contains the APIs the site calls (initiatives, reports, QR code endpoints).
- Data and seeds: the database setup and example seeds are driven from files in `src/lib/` and a small test harness exists under `src/test/integration/` for schema examples.
- Helpers: shared logic and adapters live under `src/lib/` but you can ignore those unless you're changing behavior.

## Important files (high-level map)
- Initiatives: API endpoint that powers initiative creation and listing — `src/app/api/initiatives/route.js`.
- Reporting: endpoints and UI for creating and viewing reports — `src/app/api/reports/route.js` and reporting pages under `src/app/reporting/`.
- QR codes: generation, download, and scan-tracking endpoints plus the QR UI — `src/app/api/qr-codes/*` and UI in `src/components/QRCodeManager.js`.

## Data model (plain language)
- Initiative: a named project that holds questions and settings used to collect or summarize data.
- Report: a generated summary or snapshot of initiative data (saved so it can be viewed or exported later).
- QR code: a sharable link/image that redirects users to a survey or report and records scans.
- User roles: simple roles (public, staff, admin) determine what actions a user can perform.

## Access control (plain)
- The system uses role-based permissions. Staff and Admin have elevated abilities (create initiatives, generate reports, manage QR codes); public users have limited access (take surveys, view public reports).
- Some server routes include notes to tighten session/CSRF checks; functionality is present but deployments should enable stricter checks for production.

## What `docs/` and `artifacts/` are
- `docs/` contains design notes and guidance for people working on the project — not needed to run the site.
- `artifacts/` holds sprint deliverables and exported materials used for grading or record-keeping — not part of the running application.

## Quick note on running the app
If you want a short developer Quickstart added here, I can add a simple `docs/quickstart.md` with exact commands and env vars. (I left the full run steps out of this high-level doc to keep it non-technical.)

## Next steps (suggested)
- Add `docs/quickstart.md` with simple run instructions (I can create this next).
- Optionally expand one feature section (Reporting or QR workflow) into a short, non-technical how-it-works page.

---

For an actionable map of files for a specific feature (e.g., reporting or QR workflow), tell me which feature to expand and I will add direct file+line references.
