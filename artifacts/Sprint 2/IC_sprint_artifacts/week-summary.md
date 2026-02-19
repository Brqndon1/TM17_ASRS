# Weekly Summary — Sprint 2

## Ivan Chen (ichen27)

### Feb 16 — Report Generation Feature (Core Implementation)
**Commit:** `8c7540f`
**Files changed:** 12 files, +1,445 / -89 lines

Built the full report creation and generation pipeline:

## Features Added
- Added Report Creation features such as filtering, boolean expression filter, sorting, and preview
- Added report history viewing
- Connected Report Creation to the database instead of using static Json
- Connected Reporting frontend to backend api instead of using statis Json

- **Report Creation** (`/report-creation`) — 5-step UI
  - Step 1: Select initiative + name/describe the report (`StepConfig.js`)
  - Step 2: Apply attribute filters (`StepFilters.js`)
  - Step 3: Build boolean expressions with AND/OR connectors (`StepExpressions.js`)
  - Step 4: Multi-level sorting (`StepSorting.js`)
  - Step 5: Live preview with metrics + generate button (`StepPreview.js`)
  - Wizard step indicator component (`WizardStepIndicator.js`)

- **Report Engine** (`src/lib/report-engine.js`) — Pure utility functions shared by client preview and server generation
  - `applyFilters()` — equality-based filtering
  - `applyExpressionFilter()` — boolean expressions (=, !=, >, <, contains, etc.)
  - `applySorting()` — multi-level sort
  - `computeMetrics()` — calculates totals, averages, category counts
  - `processReportData()` — full pipeline: filter -> expressions -> sort -> metrics

- **API Routes**
  - `POST /api/reports` — runs the pipeline, builds a versioned snapshot, saves to DB
  - `GET /api/reports/[id]` — fetch a single report by ID

- **Report View Page** (`/report-creation/[id]`) — displays a saved report with its snapshot data and config summary (filters, expressions, sorts applied)

- **Database** — added `reports` table columns for `initiative_id`, `name`, `description`, `status`

### Feb 16 — Merge
- Merged upstream changes from `main`

### Feb 17 — Database Wiring (Report Creation + Reporting)
**Commit:** `2bb547c`
**Files changed:** 8 files, +335 / -140 lines

Wired the report creation page and reporting page to read entirely from SQLite instead of static JSON files:

- **Database Seeding** (`src/lib/db.js`)
  - Added `summary_json` and `chart_data_json` columns to the `initiative` table
  - Upserts the 7 real initiatives (E-Gaming, Robotics, ELA, etc.) with descriptions, attributes, summary stats, and chart data from the JSON seed files
  - Seeds `field` table with ~35 field definitions (common fields: grade/school, plus initiative-specific fields discovered dynamically from `reportData.json`)
  - Seeds `form` table (1 form per initiative), `form_field` junction table linking fields to forms
  - Seeds `submission` + `submission_value` rows (25 submissions, ~175 values) matching all tableData from `reportData.json`
  - All seeding is idempotent (INSERT OR IGNORE / UPDATE)

- **Pivot Query Helper** (`src/lib/query-helpers.js`) — NEW
  - `queryTableData(db, initiativeId)` — dynamically builds a SQL pivot query to reconstruct flat table rows from the EAV `submission_value` table

- **New API Endpoints**
  - `GET /api/initiatives/[id]/report-data` — returns `{ reportId, initiativeName, summary, chartData, tableData }` from DB
  - `GET /api/trends/[id]` — serves trend data from `trendData.json` server-side

- **API Updates**
  - `GET /api/initiatives` — response now includes `id` and `name` fields (mapped from `initiative_id` / `initiative_name`)
  - `POST /api/reports` — replaced JSON file reads with DB queries + `queryTableData()`

- **Data Service** (`src/lib/data-service.js`) — switched from static JSON imports to API fetch calls
  - `getInitiatives()` -> `fetch('/api/initiatives')`
  - `getReportData(id)` -> `fetch('/api/initiatives/${id}/report-data')`
  - `getTrendData(id)` -> `fetch('/api/trends/${id}')`

- **Reporting Page** (`/reporting`) — updated to display saved reports from the DB
  - Keeps the original initiative selector cards UI
  - Each initiative shows its most recent generated report (one report per initiative)
  - If no report exists for an initiative, shows "No report has been assigned" message
  - Reports are created/assigned through the Report Creation page
