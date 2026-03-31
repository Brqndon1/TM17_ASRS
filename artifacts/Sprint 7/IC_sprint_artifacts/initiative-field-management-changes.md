# Initiative-Specific Field Management - Sprint 7 Changes

## Overview

This sprint I worked on integrating initiative-specific field management into our survey and form creation system. The main goal was to allow admin users to define common fields that work across all initiatives, as well as initiative-specific fields that only apply to certain programs. On top of that, I added field validation rules and support for new field types like date pickers, boolean yes/no, and 1-5 ratings.

After the initial implementation, I ran end-to-end testing which caught 5 integration bugs. I then went back and fixed all of them. This document covers both the feature implementation and the bug fixes.

---

## What Was Built

### 1. Field Catalog CRUD API

**File:** `src/app/api/admin/fields/route.js` (new)
**Test:** `src/app/api/admin/fields/route.test.js` (new)

Created a full REST API for managing the field catalog. Admins (access rank 100+) can create, read, update, and delete reusable field definitions. Each field has a `scope` property that can be `common`, `initiative_specific`, or `staff_only`. The GET endpoint returns fields grouped by scope so it's easy to display in the UI. The DELETE endpoint checks whether a field is currently in use on any form before allowing deletion so we don't accidentally break existing surveys.

**Impact:** Admins now have a centralized place to manage all the fields that can be used across different survey templates, instead of defining fields from scratch every time.

### 2. Shared Field Validation Module

**File:** `src/lib/field-validation.js` (new)
**Test:** `src/lib/field-validation.test.js` (new)

Built a shared validation module that both the server and client can use. The `validateFieldValue()` function checks values against their field type and optional validation rules. It handles:
- Text fields: minLength, maxLength, regex pattern
- Number/rating fields: min, max
- Date fields: ISO format validation
- Select/choice fields: checks the value is one of the allowed options
- Multiselect fields: checks all selected values are valid options

The `resolveValidationRules()` function merges base field-level rules with per-form overrides, so you can have a default rule on the field but customize it for a specific form.

**Impact:** Validation logic is consistent everywhere. Before this, there was no structured way to enforce rules on survey answers.

### 3. Database Schema Updates

**File:** `src/lib/db.js` (modified - lines ~88-97, ~156-166, ~292-330)
**File:** `src/test/integration/api-test-harness.js` (modified - lines ~82-103)

Added a `validation_rules TEXT` column to both the `field` table and the `form_field` table. The field table holds the default validation rules for a field, and the form_field table can override those rules on a per-form basis. Also had to update the migration functions that rebuild these tables so the new column doesn't get lost during migrations.

**Impact:** The database can now store validation constraints (like min/max length, allowed patterns, etc.) directly alongside field definitions.

### 4. Survey Template API Updates

**File:** `src/app/api/surveys/templates/route.js` (modified)
**Test:** `src/app/api/surveys/templates/route.test.js` (modified)

Updated the GET endpoint to expose `initiative_id`, `scope`, and merged `validation_rules` in the question objects. Updated the POST endpoint to accept `initiative_id`, per-question `scope`, `validation_rules`, `form_validation_rules`, and `field_id` for reusing existing catalog fields. Auth was raised to minAccessRank 100 for POST since only admins should create templates.

**Impact:** Templates now carry all the metadata needed for the client to render fields correctly and enforce validation.

### 5. New Field Type Renderers

**File:** `src/app/survey/page.js` (modified)

Added three new renderers to the survey taking page:
- **Date** - native HTML date input
- **Boolean** - Yes/No radio buttons with orange highlight on selection
- **Rating** - clickable 1-5 numbered buttons

Also added the `select` alias so it renders the same as `choice` (we canonicalized choice to select internally).

**Impact:** Surveys can now use these new field types and respondents will see the correct input controls.

### 6. Form Creation Page

**File:** `src/app/form-creation/page.js` (new)

Built a new form builder page that fetches initiatives from `/api/initiatives` and the field catalog from `/api/admin/fields`. Fields show up as clickable chips color-coded by scope (blue for common, orange for initiative-specific). Admins can add/remove fields, reorder them, mark them as required, and add help text. When submitted, it sends `field_id` references to the templates API so existing catalog fields get reused instead of duplicated.

**Impact:** This is the new recommended way to create survey templates. It's built around the field catalog concept and supports all the new initiative-specific features.

### 7. Client-Side Validation

**File:** `src/app/survey/page.js` (modified)

Added a validation block that runs before submission. It checks each template question's `validation_rules` and calls `validateFieldValue()` to catch errors on the client side before the data even hits the server.

**Impact:** Users get immediate feedback if their answers don't meet the validation rules, instead of getting a server error after submitting.

### 8. Server-Side Submission Validation

**File:** `src/lib/survey-validation.js` (modified)
**Test:** `src/lib/survey-validation.test.js` (new)
**File:** `src/app/api/surveys/route.js` (modified)

Added `validateTemplateAnswers()` which loops through all field definitions for a form and validates each submitted answer. This gets called in the survey submission endpoint. It checks required fields and runs the validation rules.

**Impact:** Even if someone bypasses the client-side validation (like using curl or disabling JavaScript), the server will still reject invalid submissions.

---

## Bug Fixes

After the initial implementation, end-to-end testing revealed 5 integration bugs. Here's what was wrong and how I fixed each one.

### Bug 1 (HIGH): Validation Ran After Data Was Already Saved

**File:** `src/app/api/surveys/route.js`

**Problem:** The validation block was at lines 72-101, but the `insertSurveyAndReport` transaction that persists the survey to the database ran at lines 34-70. So if someone submitted invalid data, it would get saved to the database first, and then the 400 error would be returned. The invalid data was already in there.

**Fix:** Moved the entire validation block (including field_options loading) above the insert transaction. Now validation runs first, and if it fails, nothing gets persisted.

**Impact:** Invalid survey submissions are now properly rejected without polluting the database.

### Bug 2 (HIGH): Single Template Endpoint Missing validation_rules

**File:** `src/app/api/surveys/templates/[id]/route.js`
**File:** `src/lib/adapters/survey-template-adapter.js`

**Problem:** The `/api/surveys/templates/[id]` GET endpoint (used when loading a survey via QR code) didn't include `validation_rules`, `scope`, or `initiative_id` in its SQL query. The survey template adapter also didn't preserve these fields when normalizing the response. So when the survey page loaded a template, `validation_rules` was always null and client-side validation never actually ran.

**Fix:** Updated the SQL query to select `f.scope`, `f.initiative_id`, `f.validation_rules AS field_rules`, and `ff.validation_rules AS form_field_rules`. Added the `resolveRules()` helper to merge them. Updated the adapter's `normalizeQuestion()` to pass through `scope`, `initiative_id`, and `validation_rules`.

**Impact:** Client-side validation now actually works when users take surveys loaded from QR codes or direct links.

### Bug 3 (HIGH): Select/Multiselect Option Validation Was Broken

**File:** `src/app/api/surveys/route.js`
**File:** `src/app/survey/page.js`

**Problem:** On the server side, the validation query loaded field definitions but never loaded `field_options` from the database. So for select/multiselect fields, there was no options array to validate against. On the client side, the `validateFieldValue()` call was passing `{ field_type: questionType }` without an `options` property, so it could never check if a selected option was valid.

**Fix:** Server-side: added a query to load `field_options` for select/choice/multiselect fields and attach them to the field definitions before validation. Client-side: updated the `validateFieldValue()` call to include the `options` array from the question data.

**Impact:** Option-based fields now correctly validate that the submitted value is one of the allowed options, both on client and server.

### Bug 4 (MEDIUM): Boolean "No" Answer Treated as Empty

**File:** `src/app/survey/page.js`
**File:** `src/lib/survey-validation.js`

**Problem:** The required field check used `!templateResponses[qId]` on the client and `value === ''` on the server. In JavaScript, `!false` evaluates to `true`, so answering "No" on a required boolean question would fail the required check. Same issue with `false === ''` being false but the check not accounting for boolean values at all.

**Fix:** Changed the empty checks to explicitly check for `undefined` and `null` only, using `typeof value === 'string' && value === ''` instead of just `value === ''`. Added a specific `boolean` type branch in the client-side required check that only considers `undefined` and `null` as missing.

**Impact:** Users can now answer "No" on required boolean questions without getting a false "field is required" error.

### Bug 5 (MEDIUM): Legacy SurveyForm.js Missing Metadata and Renderers

**File:** `src/components/SurveyForm.js`

**Problem:** The legacy form builder component didn't wrap its questions in the `{ text: {...} }` structure the API expects. It also didn't include `scope` in the payload. The preview modal was missing renderers for the new date, boolean, and rating field types, so those would show up blank in preview.

**Fix:** Updated the submit payload to wrap each question in `{ text: {...} }` with `scope: 'common'`. Added preview renderers for date (date input), boolean (Yes/No radios), and rating (1-5 number circles).

**Impact:** Templates created through the legacy builder now save correctly and the preview shows all field types.

---

## Testing

All 206 existing tests continue to pass. The 5 failing tests were pre-existing failures unrelated to this work (confirmed by checking against the baseline before any changes). New test files added:
- `src/lib/field-validation.test.js` - 18 tests covering all validation scenarios
- `src/app/api/admin/fields/route.test.js` - 7 tests covering CRUD operations
- `src/lib/survey-validation.test.js` - 5 tests for template answer validation

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/db.js` | Modified | Added validation_rules column to field and form_field tables + migrations |
| `src/test/integration/api-test-harness.js` | Modified | Mirror schema changes in test database |
| `src/lib/field-validation.js` | New | Shared validation module for client and server |
| `src/lib/field-validation.test.js` | New | Tests for validation module |
| `src/app/api/admin/fields/route.js` | New | Field catalog CRUD API |
| `src/app/api/admin/fields/route.test.js` | New | Tests for field catalog API |
| `src/app/api/surveys/templates/route.js` | Modified | Added initiative_id, scope, validation_rules support |
| `src/app/api/surveys/templates/route.test.js` | Modified | Updated auth rank in tests |
| `src/app/api/surveys/templates/[id]/route.js` | Modified | Added validation_rules, scope, initiative_id to GET response |
| `src/lib/adapters/survey-template-adapter.js` | Modified | Preserve validation_rules, scope, initiative_id |
| `src/lib/survey-validation.js` | Modified | Added validateTemplateAnswers, fixed boolean empty check |
| `src/lib/survey-validation.test.js` | New | Tests for template answer validation |
| `src/app/api/surveys/route.js` | Modified | Moved validation before persistence, added field_options loading |
| `src/app/survey/page.js` | Modified | New renderers, client validation, boolean fix |
| `src/components/SurveyForm.js` | Modified | Fixed payload structure, added preview renderers |
| `src/app/form-creation/page.js` | New | New form builder with field catalog integration |
