## US-035 – Goal Edit Conflict Detection and Resolution

### Overview

This sprint implements optimistic concurrency control for initiative goals so that concurrent edits are detected, queued for review, and resolved by admins without silent data loss. Staff continue to work in the existing Goals page, but their saves now carry a lightweight version token; when a conflict is detected the change is turned into a “goal edit conflict” for admin review instead of overwriting newer data.

### Backend Changes

- **New conflict table (`goal_edit_conflict`)**
  - Stores one row per detected goal edit conflict:
    - `goal_id`, `initiative_id`
    - `status` (`pending` / `resolved`) and `resolution` (`applied_proposal` / `rejected_proposal`)
    - `expected_updated_at` (what the client thought the goal’s `updated_at` was)
    - `detected_server_updated_at` (actual `updated_at` when the conflict was detected)
    - `proposed_patch` (JSON of only the fields the user attempted to change)
    - `server_snapshot` (JSON snapshot of the goal fields at conflict time)
    - `submitter_email`, `resolved_by_email`
    - `created_at`, `resolved_at`
  - Indexed by `status, created_at` (for “pending” views) and by `goal_id` for lookups.

- **Shared goal update helper**
  - New module `src/lib/goals/perform-goal-update.js` encapsulates the core `initiative_goal` update logic:
    - Validates `scoring_method`.
    - Builds a dynamic `UPDATE` over allowed fields and always bumps `updated_at`.
    - When `current_value` changes, appends a row to `goal_progress_history` with a freshly computed score.
    - Builds a per-field `{ from, to }` diff and writes a `goal.updated` entry via `logAudit`.
  - This helper is used both by the normal goals `PUT` route and by the admin conflict resolution route to ensure consistent behavior and audit logging.

- **`PUT /api/goals` – optimistic concurrency**
  - Request body now accepts an optional `expected_updated_at`:
    - If omitted, the behavior is **unchanged** (last-write-wins update using `performGoalUpdate`).
    - If provided, the route compares it against the current `updated_at` in `initiative_goal`.
  - When `expected_updated_at` **does not match** the database:
    - The server **does not** apply the update.
    - A new row is inserted into `goal_edit_conflict` capturing the proposed patch and server snapshot.
    - An audit entry is written: `event: 'goal.conflict_detected'` with conflict metadata.
    - A domain event `goal.edit.conflict` (`GOAL_EDIT_CONFLICT`) is published on the event bus; the existing audit subscriber logs it.
    - The API responds with **409 Conflict** and a payload of:
      - `error` message explaining that someone else saved first.
      - `conflict: true`, `conflict_id`.
      - A fresh copy of the current goal (including a recomputed `score` and `daysUntilDeadline`).

- **New admin API – goal conflict management**
  - `GET /api/admin/goal-conflicts`
    - Admin-only (`minAccessRank: 100`, `requireCsrf: false` for reads).
    - Supports:
      - `status=pending|resolved|all` (default `pending`).
      - `limit` with an upper bound to keep responses bounded.
      - `pendingCount=1` shortcut, which returns `{ pendingCount }` for use in nav badges.
    - Each conflict row is hydrated with `initiative_name` and its JSON fields parsed into objects for the UI.
  - `PATCH /api/admin/goal-conflicts`
    - Admin-only, CSRF-protected.
    - Accepts `{ conflict_id, action: "apply" | "reject" }`.
    - **Reject path**:
      - Marks the row as `resolved` with `resolution = 'rejected_proposal'`, sets `resolved_by_email` and `resolved_at`.
      - Emits `goal.conflict_resolved` in the audit log with the resolution and submitter.
    - **Apply path**:
      - Re-reads the current `initiative_goal` row.
      - If the goal no longer exists, closes the conflict as `rejected_proposal` with a 410-style message.
      - Otherwise passes the stored `proposed_patch` to `performGoalUpdate` so:
        - The goal is updated using the same validation, progress history insertion, and `goal.updated` audit logging as normal PUT.
      - Marks the conflict as `resolved` with `resolution = 'applied_proposal'` and writes a `goal.conflict_resolved` audit entry including which fields were applied.

- **Events and audit**
  - `src/lib/events/event-types.js` now defines `GOAL_EDIT_CONFLICT: 'goal.edit.conflict'`.
  - `audit-subscriber` subscribes to `goal.edit.conflict` and logs it, giving operators a low-friction signal anytime conflicts are occurring.
  - Existing audit logging (`goal.created`, `goal.updated`, `goal.deleted`) continues to work, with the new conflict lifecycle events layered on top.

### Frontend Changes

- **Staff Goals page – versioned saves and conflict UX**
  - The Goals page (`/goals`) now tracks the goal’s `updated_at` at the moment editing begins:
    - On `startEditing(goal)` it caches `goal.updated_at` into a new `editBaselineUpdatedAt` state.
    - The PUT body includes `expected_updated_at: editBaselineUpdatedAt` along with the usual fields.
  - On successful save (no conflict), behavior is unchanged: a success message is shown, edit state is cleared, and goals are refreshed.
  - On **409 Conflict** with `conflict: true`:
    - The page displays a user-friendly message explaining that:
      - Another user saved the goal first.
      - The user’s changes were queued for an admin as a “goal edit conflict”.
      - The list below reflects the current server version and can be refreshed after an admin resolves the conflict.
    - The editor closes and the goals list is reloaded from the server.

- **Admin navigation and discovery**
  - **Header nav**:
    - For admins, a new **“Data conflicts”** tab (`/admin/conflicts`) appears next to **User Management** and **Audit Logs**.
    - The header periodically (every ~45s) calls `GET /api/admin/goal-conflicts?pendingCount=1` when an admin is logged in.
    - If there are any pending conflicts, a red numeric badge appears on the “Data conflicts” tab (capped at `99+`).
  - **Home page cards**:
    - Under the **Administration** section, a new card is shown:
      - **Label**: “Data conflicts”
      - **Description**: Highlights that admins can “Review concurrent goal edits and approve or reject proposed changes.”

- **Admin Conflicts page**
  - New route `/admin/conflicts` implemented in `src/app/admin/conflicts/page.js`.
  - Access-controlled to admin users only (leveraging the existing `useAuthStore` and redirect pattern).
  - Features:
    - Status filter (`pending`, `resolved`, `all`) and a manual Refresh button.
    - For each conflict:
      - Header showing goal id, goal name, initiative name, submitter email, created timestamp, and status/resolution pill.
      - A short explanation of which `updated_at` the client expected versus what the server saw at conflict time.
      - A side-by-side style diff list, using field-specific labels:
        - The current server value is shown with a strikethrough + red color.
        - The proposed value from the staff edit is shown in green.
      - Actions:
        - **Approve (apply proposed values)** – calls `PATCH /api/admin/goal-conflicts` with `action = "apply"`.
        - **Reject (keep current data)** – calls the same endpoint with `action = "reject"`.
    - Resolved conflicts display who resolved them and when, so the audit trail is visible directly in the UI.

### Acceptance Criteria Mapping

- **Detect conflicting attribute changes**
  - Achieved via `expected_updated_at` optimistic concurrency on `PUT /api/goals` and a strict comparison against the row’s current `updated_at`.

- **Alert admin users via notification**
  - Conflicts are written into `goal_edit_conflict` and surfaced to admins via:
    - A **badge** on the “Data conflicts” header tab (polled count of pending conflicts).
    - The dedicated **Goal edit conflicts** admin page listing all pending items.
  - The `goal.edit.conflict` event is also published on the server event bus and logged by the audit subscriber.

- **Admin approves/rejects changes**
  - Admins use `/admin/conflicts` to either:
    - **Approve**: apply the stored `proposed_patch` to the goal via the shared update helper.
    - **Reject**: close the conflict without changing the underlying goal.

- **Log conflict resolution**
  - Conflict lifecycle is captured in the `audit_log` table via:
    - `goal.conflict_detected` when a conflict is first created.
    - `goal.conflict_resolved` when an admin applies or rejects the proposal (recording resolution type, who resolved it, and which fields were applied when relevant).

