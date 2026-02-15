# US-010: Distribution API Endpoints

## Overview

These endpoints power the survey distribution feature (US-010). Admins use them to create distributions with start/end dates and recipient lists, and to retrieve all distributions with auto-computed statuses.

**Base path:** `/api/surveys/distributions`  
**Source file:** `src/app/api/surveys/distributions/route.js`

---

## POST `/api/surveys/distributions`

Create a new survey distribution record.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `survey_template_id` | string | ✅ | ID of the survey template from `src/data/surveys.json` |
| `title` | string | ✅ | Display title for the distribution |
| `start_date` | string | ✅ | ISO date (`YYYY-MM-DD`) — when submissions open |
| `end_date` | string | ✅ | ISO date (`YYYY-MM-DD`) — submission deadline |
| `recipient_emails` | string[] | ❌ | Array of recipient email addresses (defaults to `[]`) |
| `created_by_user_id` | integer | ❌ | User ID of the admin creating the distribution |

### Validation Rules

| Rule | Error Message | Status |
|------|---------------|--------|
| All four required fields must be present | `"Missing required fields: survey_template_id, title, start_date, end_date"` | `400` |
| Dates must be valid ISO format | `"Invalid date format. Use ISO date strings (e.g. 2026-03-01)"` | `400` |
| `end_date` must be strictly after `start_date` | `"end_date must be after start_date"` | `400` |
| `start_date` must be today or later | `"start_date cannot be in the past"` | `400` |

### Initial Status Computation

- If `start_date ≤ today ≤ end_date` → status = **`active`**
- Otherwise → status = **`pending`**

### Response — `201 Created`

```json
{
  "success": true,
  "distribution_id": 1,
  "status": "active",
  "message": "Distribution \"Spring 2026 Campus Feedback\" created successfully"
}
```

### Response — `400 Bad Request`

```json
{
  "error": "end_date must be after start_date"
}
```

### Response — `500 Internal Server Error`

```json
{
  "error": "Failed to create distribution",
  "details": "..."
}
```

---

## GET `/api/surveys/distributions`

Retrieve all distributions, ordered by `created_at DESC`. Statuses are **auto-computed on read** by comparing the current date to each distribution's `start_date` and `end_date`.

### Request

No query parameters or body required.

### Auto-Status Logic (on each read)

| Condition | Computed Status |
|-----------|-----------------|
| `today > end_date` | `closed` |
| `start_date ≤ today ≤ end_date` | `active` |
| `today < start_date` | `pending` |

If the computed status differs from the stored value, the database row is updated in place (persisted).

### Response — `200 OK`

```json
{
  "distributions": [
    {
      "distribution_id": 1,
      "survey_template_id": "1739547713498",
      "title": "Spring 2026 Campus Feedback",
      "start_date": "2026-02-15",
      "end_date": "2026-03-15",
      "status": "active",
      "recipient_emails": ["student1@syr.edu", "student2@syr.edu"],
      "response_count": 0,
      "created_at": "2026-02-15 19:28:08",
      "created_by_user_id": null
    }
  ]
}
```

### Response — `500 Internal Server Error`

```json
{
  "error": "Failed to fetch distributions",
  "details": "..."
}
```

---

## Added In

- **File created:** `src/app/api/surveys/distributions/route.js`
- **Story:** US-010 (Sprint 2) — Step 2 of 5
- **Author:** Ashton Hernandez
