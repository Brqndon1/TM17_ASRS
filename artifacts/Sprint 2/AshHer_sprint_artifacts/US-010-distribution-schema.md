# US-010: Survey Distribution Schema

## Overview

The `survey_distribution` table supports **US-010 — Distribute Surveys**. It allows admin users to distribute survey templates to respondents with controlled start/end dates, track distribution status, and automatically close surveys when their deadline passes.

This table lives in the SQLite database (`data/asrs.db`) and is created by `src/lib/db.js` during database initialization.

---

## Table: `survey_distribution`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `distribution_id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for each distribution record |
| `survey_template_id` | TEXT | NOT NULL | References the survey template ID from `src/data/surveys.json` |
| `title` | TEXT | NOT NULL | Display title for this distribution (e.g., "Spring 2026 Feedback") |
| `start_date` | TEXT | NOT NULL | ISO date string — when respondents can begin submitting (e.g., `2026-02-15`) |
| `end_date` | TEXT | NOT NULL | ISO date string — submission deadline (e.g., `2026-03-15`) |
| `status` | TEXT | NOT NULL, DEFAULT `'pending'`, CHECK (`pending`, `active`, `closed`) | Current state of the distribution |
| `recipient_emails` | TEXT | NOT NULL, DEFAULT `'[]'` | JSON array of recipient email addresses |
| `response_count` | INTEGER | NOT NULL, DEFAULT `0` | Number of survey responses received for this distribution |
| `created_at` | TEXT | DEFAULT `datetime('now')` | Timestamp when the distribution was created |
| `created_by_user_id` | INTEGER | REFERENCES `user(user_id)` | The admin/staff user who created this distribution |

---

## Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_distribution_status` | `status` | Fast lookup of distributions by status (pending/active/closed) |
| `idx_distribution_dates` | `start_date, end_date` | Efficient date-range queries for auto-close logic |

---

## Status Lifecycle

```
pending  →  active  →  closed
```

- **pending** — Created but the start date hasn't arrived yet
- **active** — Currently accepting submissions (between start and end dates)
- **closed** — End date has passed; submissions are rejected

Status is computed automatically on read: the API compares the current date against `start_date` and `end_date` and updates the stored status accordingly.

---

## Relationships

- `survey_template_id` → references survey templates stored in `src/data/surveys.json` (managed by the `/api/surveys/templates` route)
- `created_by_user_id` → references `user(user_id)` in the `user` table

---

## Added In

- **File modified:** `src/lib/db.js`
- **Story:** US-010 (Sprint 2)
- **Author:** Ashton Hernandez
