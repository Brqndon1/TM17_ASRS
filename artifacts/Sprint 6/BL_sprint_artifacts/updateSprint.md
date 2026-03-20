# Goal Setting & Performance Comparison — Implementation Summary

## Story

**Goal Setting and Performance Comparison**
The staff and admin user should be able to see visuals in the form of line charts for the goals set against how the initiative is currently doing.

## Overview

This feature adds a line chart visualization to the Performance Scoring Dashboard that tracks initiative goal progress over time. Staff and admin users can select any initiative from a dropdown and view a time-series chart comparing actual weighted performance (red line) against the 100% target (green dashed line). Historical snapshots are recorded automatically whenever a goal is created or its progress is updated.

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/goals/history/route.js` | API endpoint that returns time-series data for an initiative's goal progress, grouped by date with weighted overall scores |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/lib/db.js` | Added `goal_progress_history` table and indexes (`idx_goal_history_initiative`, `idx_goal_history_goal`) inside `initializeDatabase()` |
| `src/app/api/goals/route.js` | Added snapshot inserts in both the POST handler (records initial data point on goal creation) and the PUT handler (records a snapshot whenever `current_value` or `target_value` is updated) |
| `src/app/performance-dashboard/page.js` | Added Recharts line chart section with initiative selector dropdown, moved summary stats above the table, made table rows clickable to select initiatives, added staff access alongside admin |

### New Dependency

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | latest | React charting library for the line chart visualization |

## Database Schema Addition

```sql
CREATE TABLE IF NOT EXISTS goal_progress_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES initiative_goal(goal_id) ON DELETE CASCADE,
  initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id) ON DELETE CASCADE,
  recorded_value REAL NOT NULL,
  target_value REAL NOT NULL,
  score REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goal_history_initiative
  ON goal_progress_history(initiative_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_goal_history_goal
  ON goal_progress_history(goal_id, recorded_at);
```

The table uses `CREATE TABLE IF NOT EXISTS`, so it will be created automatically on app startup without requiring any manual migration or table drops.

## API Endpoint

### `GET /api/goals/history?initiativeId={id}`

Returns the progress timeline for a given initiative. Requires staff or admin access (minAccessRank: 50).

**Response shape:**

```json
{
  "initiative": {
    "initiative_id": 1,
    "initiative_name": "Bags2School Initiative"
  },
  "timeline": [
    {
      "date": "2026-03-01",
      "overallScore": 25.5,
      "targetScore": 100,
      "goalBreakdown": [
        {
          "goal_id": 1,
          "goal_name": "Student Enrollment",
          "recorded_value": 50,
          "target_value": 200,
          "score": 25,
          "weight": 1
        }
      ]
    }
  ],
  "totalSnapshots": 5
}
```

The endpoint groups snapshots by date, keeps the latest snapshot per goal per date, and computes a weighted overall score matching the same logic used in the existing goals route (`computeGoalScore` with linear/threshold/binary methods).

## How Snapshots Are Recorded

Snapshots are inserted automatically in two places within `src/app/api/goals/route.js`:

1. **POST handler** — When a new goal is created, an initial snapshot is recorded with the starting `current_value` and `target_value`.
2. **PUT handler** — When a goal's `current_value` or `target_value` is updated, a new snapshot is recorded with the updated values and computed score.

No manual action is required to populate the history. The chart data builds up organically as goals are managed through the application.

## Frontend Changes

The Performance Scoring Dashboard (`src/app/performance-dashboard/page.js`) now includes:

- **Line chart section** at the top of the page (above the table) with a dropdown to select an initiative
- **Red solid line** showing the actual weighted score across all goals over time
- **Green dashed line** showing the 100% target
- **Custom tooltip** displaying exact scores on hover
- **Clickable table rows** that also select the initiative in the chart (with a "viewing chart" badge)
- **Summary stats cards** (Average Score, Highest Score, Lowest Score, Total Goals) relocated from below the table to above it
- **Staff access** — the page now allows both staff and admin users (previously admin only)
- **Empty states** for when no initiative is selected, when an initiative has no history yet, and for loading/error conditions

## Setup for Other Team Members

After pulling these changes:

1. Run `npm install` (to install `recharts`)
2. Restart the dev server (`npm run dev`)

No database drops or manual migrations are needed. The new table creates itself automatically on startup.