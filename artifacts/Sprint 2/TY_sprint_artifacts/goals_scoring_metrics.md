# Sprint 2 Report — TaeYoon (US-014: Set Initiative Goals)

## Task

**User Story:** As an admin user, I can set goals for each initiative with scoring criteria so that they can measure performance against targets.

**Original ID:** US-014
**Depends on:** US-006

---

## Summary of Changes

### 1. Database Schema — Initiative Goals Table

**File:** `src/lib/db.js`

Added the `initiative_goal` table to the SQLite database schema:

| Column               | Type       | Description                                             |
| -------------------- | ---------- | ------------------------------------------------------- |
| `goal_id`            | INTEGER PK | Auto-incrementing primary key                           |
| `initiative_id`      | INTEGER FK | Links to the `initiative` table                         |
| `goal_name`          | TEXT       | Name of the goal                                        |
| `description`        | TEXT       | Optional description                                    |
| `target_metric`      | TEXT       | What is being measured (e.g., "Number of participants") |
| `target_value`       | REAL       | The target number to hit                                |
| `current_value`      | REAL       | Current progress toward the target                      |
| `weight`             | REAL       | Relative importance for scoring (e.g., 1.0, 2.0)        |
| `scoring_method`     | TEXT       | One of: `linear`, `threshold`, `binary`                 |
| `created_at`         | TEXT       | Auto-set timestamp                                      |
| `updated_at`         | TEXT       | Updated on each edit                                    |
| `created_by_user_id` | INTEGER FK | Links to the `user` table                               |

Also added:

- Index `idx_goal_initiative` on `initiative_id` for query performance
- `GOAL_MANAGE` entry in the `feature` and `feature_access` tables (admin-only, access_rank = 100)

---

### 2. Backend API — Goals CRUD + Score Computation

**File:** `src/app/api/goals/route.js`

Full REST API for managing initiative goals:

| Method     | Endpoint                    | Description                                            |
| ---------- | --------------------------- | ------------------------------------------------------ |
| **GET**    | `/api/goals?initiativeId=N` | Fetch all goals for an initiative with computed scores |
| **POST**   | `/api/goals`                | Create a new goal (validates all required fields)      |
| **PUT**    | `/api/goals`                | Update an existing goal by `goal_id`                   |
| **DELETE** | `/api/goals?goalId=N`       | Delete a goal                                          |

**Score Computation Logic:**

Each goal gets an individual score based on its `scoring_method`:

- **Linear:** `score = min(current_value / target_value * 100, 100)` — proportional progress
- **Threshold:** `score = 100` if `current_value >= target_value`, else `0` — all-or-nothing
- **Binary:** `score = 100` if `current_value > 0`, else `0` — any progress counts

The **overall initiative score** is a weighted average:

```
overallScore = sum(goal_score * goal_weight) / sum(all_weights)
```

This is computed on every GET request and returned alongside the goals array.

**Helper API:** `src/app/api/goals/initiatives/route.js` — fetches all initiatives from the database for the dropdown selector on the goals page.

---

### 3. Frontend — Goals & Scoring Page

**File:** `src/app/goals/page.js`

Admin-only page at `/goals` with the following features:

- **Access control:** Redirects non-admin users to the home page
- **Initiative selector:** Dropdown populated from the `initiative` database table
- **Overall score display:** Large color-coded percentage with progress bar (green >= 80%, yellow >= 50%, red < 50%)
- **Goal cards:** Each goal displays:
  - Goal name and description
  - Target metric and progress (current / target)
  - Weight and scoring method
  - Individual score badge (color-coded)
  - Progress bar
  - Edit and Delete buttons
- **Add goal form:** Expandable form with fields for goal name, description, target metric, target value, current value, weight, and scoring method
- **Inline editing:** Click "Edit" on any goal to modify its values in-place
- **Delete with confirmation:** Prompts before removing a goal

---

### 4. Navigation Updates

**File:** `src/components/Header.js`

- Added "Goals" tab in the header navigation, visible only to admin users (next to "User Management")

**File:** `src/app/page.js`

- Added "Goals & Scoring" card on the home page, visible only to logged-in admin users
- Added `adminOnly` flag to route filtering logic

---

### 5. Back Button Component

**File:** `src/components/BackButton.js`

Created a reusable back-arrow component that links to the home page. Added it to all main pages:

- `/initiative-creation`
- `/form-creation`
- `/survey`
- `/report-creation`
- `/reporting`
- `/goals`

---

### 6. UI Improvements

**File:** `src/app/initiative-creation/page.js`

- Grouped form into card sections (Basic Information, Attributes, Settings, Questions)
- Narrower layout (720px max-width) for better readability
- Side-by-side settings layout (Status + Public toggle)
- Fixed the status message banner (was previously commented out)
- Extracted shared styles for consistency

**File:** `src/app/login/page.js`

- Updated test credentials display to show both Admin and Staff accounts in a 2-column grid with role-colored labels

---

### 7. Bug Fix — Missing Password Column

**File:** `src/lib/db.js`

- Added `password TEXT NOT NULL` column to the `user` table schema (was missing, causing login failures)

---

## Data Flow Diagram

```
Admin opens /goals
  |
  v
Select initiative from dropdown
  |
  v
GET /api/goals?initiativeId=N
  |
  v
Backend queries initiative_goal table
  |
  v
Computes individual scores (linear/threshold/binary)
  |
  v
Computes weighted overall score
  |
  v
Returns { goals[], overallScore }
  |
  v
Frontend renders score dashboard + goal cards

Admin adds/edits/deletes a goal:
  |
  v
POST/PUT/DELETE /api/goals
  |
  v
Database updated
  |
  v
Frontend refetches → scores recomputed → UI updates
```

---

## Files Changed

| File                                     | Action                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/lib/db.js`                          | Modified — added `initiative_goal` table, `password` column, `GOAL_MANAGE` feature seed |
| `src/app/api/goals/route.js`             | **New** — Goals CRUD API with score computation                                         |
| `src/app/api/goals/initiatives/route.js` | **New** — Initiative list API for goals page                                            |
| `src/app/goals/page.js`                  | **New** — Admin goals & scoring page                                                    |
| `src/components/BackButton.js`           | **New** — Reusable back navigation component                                            |
| `src/components/Header.js`               | Modified — added Goals nav link (admin-only)                                            |
| `src/app/page.js`                        | Modified — added Goals card + adminOnly filter                                          |
| `src/app/login/page.js`                  | Modified — updated test credentials display                                             |
| `src/app/initiative-creation/page.js`    | Modified — UI cleanup and card sections                                                 |
| `src/app/form-creation/page.js`          | Modified — added BackButton                                                             |
| `src/app/survey/page.js`                 | Modified — added BackButton                                                             |
| `src/app/report-creation/page.js`        | Modified — added BackButton                                                             |
| `src/app/reporting/page.js`              | Modified — added BackButton                                                             |

---

## Acceptance Criteria Status

| Criteria                         | Status                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| Define goals per initiative      | Done — goals are created per initiative via dropdown selector       |
| Set target metrics and weights   | Done — each goal has target_metric, target_value, and weight fields |
| Define scoring criteria          | Done — three scoring methods: linear, threshold, binary             |
| Save goal configurations         | Done — full CRUD via `/api/goals` with SQLite persistence           |
| Compute overall initiative score | Done — weighted average computed on every GET request               |
