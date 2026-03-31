# Initiative Field Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admin users to define reusable common and initiative-specific fields with validation rules and field type configuration, then compose those fields into initiative-scoped forms via the `/form-creation` page.

**Architecture:** Two-layer design: (1) a field catalog API (`/api/admin/fields`) provides full CRUD for reusable field definitions with scope, validation rules, and options; (2) a form builder API and UI (`/form-creation`) composes forms from catalog fields via the existing `form_field` junction table. Validation rules are enforced at three levels: admin save, public survey renderer, and submission API. The `choice` type is canonicalized to `select` throughout.

**Tech Stack:** Next.js 16 (App Router), better-sqlite3, Vitest, React 19

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/db.js:292-301` | Add `validation_rules` column to `field` table, add `validation_rules` to `form_field` table for per-form overrides |
| Modify | `src/test/integration/api-test-harness.js:82-91` | Mirror schema changes in test DB |
| Create | `src/lib/field-validation.js` | Shared validation logic: `validateFieldValue(value, field, rules)` used by both client and server |
| Create | `src/app/api/admin/fields/route.js` | Full CRUD API for the field catalog (GET/POST/PUT/DELETE) |
| Create | `src/app/api/admin/fields/route.test.js` | Tests for field catalog API |
| Modify | `src/app/api/surveys/templates/route.js:55-163` | Accept `initiative_id` and `scope` per question; reuse existing field IDs when provided |
| Modify | `src/app/api/surveys/templates/route.js:5-52` | Expose `scope`, `initiative_id`, `validation_rules` in GET response |
| Modify | `src/app/api/surveys/route.js:72-138` | Enforce field-level validation rules on submission |
| Modify | `src/lib/survey-validation.js` | Add `validateTemplateAnswers(answers, fields)` for schema-driven validation |
| Modify | `src/app/form-creation/page.js` | Build out the form builder UI: initiative picker, field catalog browser, drag-to-add, validation config |
| Modify | `src/app/survey/page.js:620-825` | Add renderers for `date`, `boolean`, `rating`, `select` types; apply client-side validation rules |
| Modify | `src/components/SurveyForm.js:202-208` | Add `date`, `boolean`, `rating` to type dropdown; rename `choice` to `select` |
| Modify | `src/app/api/surveys/templates/route.test.js` | Update tests for new fields |

---

### Task 1: Canonicalize `choice` to `select`

Before adding new features, normalize the inconsistent type. The DB CHECK constraint allows both `select` and `choice`. The builder creates `choice`, the GET handler recognizes `choice`, but the schema's canonical single-select type should be `select`.

**Files:**
- Modify: `src/lib/db.js:296` (remove `choice` from CHECK, keep for migration)
- Modify: `src/components/SurveyForm.js:202-208` (rename choice to select in dropdown)
- Modify: `src/components/SurveyForm.js:61,111,119,130,142` (change `choice` refs to `select`)
- Modify: `src/app/api/surveys/templates/route.js:26,111` (handle both `choice` and `select` for reads; write `select`)
- Modify: `src/app/survey/page.js:672` (render `select` same as `choice`)
- Modify: `src/test/integration/api-test-harness.js:82-91` (mirror)

- [ ] **Step 1: Update SurveyForm.js to use `select` instead of `choice`**

In `src/components/SurveyForm.js`, replace every occurrence of the string `'choice'` with `'select'`:

```jsx
// Line 61: was q.type === 'choice'
if (field === 'type' && value === 'select' && (!copy[idx].options || copy[idx].options.length === 0)) {

// Line 202-208: update the <option> in the type dropdown
<option value="select">Multiple Choice</option>
```

All references on lines 61, 111, 119, 120, 130, 142 change `'choice'` to `'select'`.

- [ ] **Step 2: Update the template API to write `select` and read both**

In `src/app/api/surveys/templates/route.js`:

Line 26 (GET): accept both types when checking for option-based fields:
```js
const isOptionType = q.field_type === 'select' || q.field_type === 'multiselect' || q.field_type === 'choice';
```

Line 111 (POST): change condition to write `select`:
```js
if ((fieldType === 'select' || fieldType === 'multiselect') && Array.isArray(textObj.options)) {
```

- [ ] **Step 3: Update the public survey renderer**

In `src/app/survey/page.js`, line 672, add `select` to the condition:
```jsx
{(questionType === 'choice' || questionType === 'select') && questionOptions.length > 0 && (
```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

Run: `npx vitest run src/app/api/surveys/templates/route.test.js`
Expected: All existing tests PASS (they insert `choice` directly into DB which still works for reads).

- [ ] **Step 5: Commit**

```bash
git add src/components/SurveyForm.js src/app/api/surveys/templates/route.js src/app/survey/page.js
git commit -m "refactor: canonicalize 'choice' field type to 'select' throughout survey stack"
```

---

### Task 2: Add `validation_rules` columns to DB schema

**Files:**
- Modify: `src/lib/db.js:292-301` (add column to `field` table)
- Modify: `src/lib/db.js:322-330` (add column to `form_field` table)
- Modify: `src/test/integration/api-test-harness.js:82-100` (mirror both)

- [ ] **Step 1: Add `validation_rules` to `field` table in `src/lib/db.js`**

After line 300 (`is_required_default`), add a new column:
```sql
CREATE TABLE IF NOT EXISTS field (
  field_id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_key TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','number','date','boolean','select','multiselect','rating','json','choice','yesno')),
  scope TEXT NOT NULL DEFAULT 'common' CHECK (scope IN ('common','initiative_specific','staff_only')),
  initiative_id INTEGER REFERENCES initiative(initiative_id),
  is_filterable INTEGER NOT NULL DEFAULT 0,
  is_required_default INTEGER NOT NULL DEFAULT 0,
  validation_rules TEXT
);
```

`validation_rules` is a JSON string like: `{"minLength":1,"maxLength":500,"pattern":"^[A-Z]","min":0,"max":100}`

- [ ] **Step 2: Add `validation_rules` to `form_field` table in `src/lib/db.js`**

After line 329 (`help_text`), add:
```sql
CREATE TABLE IF NOT EXISTS form_field (
  form_field_id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL REFERENCES form(form_id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES field(field_id),
  display_order INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  help_text TEXT,
  validation_rules TEXT
);
```

This allows per-form overrides of a field's default validation rules.

- [ ] **Step 3: Mirror in test harness**

In `src/test/integration/api-test-harness.js`, update the `field` table (line 82-91):
```sql
CREATE TABLE field (
  field_id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_key TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'common',
  initiative_id INTEGER,
  is_filterable INTEGER NOT NULL DEFAULT 0,
  is_required_default INTEGER NOT NULL DEFAULT 0,
  validation_rules TEXT
);
```

Update the `form_field` table (line 93-103):
```sql
CREATE TABLE form_field (
  form_field_id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL,
  field_id INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  help_text TEXT,
  validation_rules TEXT,
  FOREIGN KEY (form_id) REFERENCES form(form_id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES field(field_id) ON DELETE CASCADE
);
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All PASS (new column is nullable, no existing data breaks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js src/test/integration/api-test-harness.js
git commit -m "feat: add validation_rules column to field and form_field tables"
```

---

### Task 3: Create shared field validation logic

**Files:**
- Create: `src/lib/field-validation.js`
- Create: `src/lib/field-validation.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/field-validation.test.js`:

```js
import { validateFieldValue } from './field-validation';

describe('validateFieldValue', () => {
  test('returns null for valid text within maxLength', () => {
    const error = validateFieldValue('hello', { field_type: 'text' }, { maxLength: 10 });
    expect(error).toBeNull();
  });

  test('returns error when text exceeds maxLength', () => {
    const error = validateFieldValue('hello world', { field_type: 'text' }, { maxLength: 5 });
    expect(error).toMatch(/at most 5/);
  });

  test('returns error when text is shorter than minLength', () => {
    const error = validateFieldValue('hi', { field_type: 'text' }, { minLength: 5 });
    expect(error).toMatch(/at least 5/);
  });

  test('returns error when text fails pattern', () => {
    const error = validateFieldValue('hello', { field_type: 'text' }, { pattern: '^[A-Z]' });
    expect(error).toMatch(/format/i);
  });

  test('returns null when text matches pattern', () => {
    const error = validateFieldValue('Hello', { field_type: 'text' }, { pattern: '^[A-Z]' });
    expect(error).toBeNull();
  });

  test('returns error when number is below min', () => {
    const error = validateFieldValue(3, { field_type: 'number' }, { min: 5 });
    expect(error).toMatch(/at least 5/);
  });

  test('returns error when number exceeds max', () => {
    const error = validateFieldValue(15, { field_type: 'number' }, { max: 10 });
    expect(error).toMatch(/at most 10/);
  });

  test('returns null for valid number within range', () => {
    const error = validateFieldValue(7, { field_type: 'number' }, { min: 5, max: 10 });
    expect(error).toBeNull();
  });

  test('returns null when no rules provided', () => {
    const error = validateFieldValue('anything', { field_type: 'text' }, null);
    expect(error).toBeNull();
  });

  test('returns null when rules is empty object', () => {
    const error = validateFieldValue('anything', { field_type: 'text' }, {});
    expect(error).toBeNull();
  });

  test('validates date is a valid ISO date string', () => {
    const error = validateFieldValue('not-a-date', { field_type: 'date' }, {});
    expect(error).toMatch(/valid date/i);
  });

  test('returns null for valid date', () => {
    const error = validateFieldValue('2026-03-31', { field_type: 'date' }, {});
    expect(error).toBeNull();
  });

  test('validates select value is one of the allowed options', () => {
    const error = validateFieldValue('invalid', { field_type: 'select', options: ['a', 'b'] }, {});
    expect(error).toMatch(/valid option/i);
  });

  test('returns null for valid select value', () => {
    const error = validateFieldValue('a', { field_type: 'select', options: ['a', 'b'] }, {});
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/field-validation.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `field-validation.js`**

Create `src/lib/field-validation.js`:

```js
/**
 * Validate a single field value against its type and optional rules.
 *
 * @param {*} value - The submitted value
 * @param {{ field_type: string, options?: string[] }} field - Field metadata
 * @param {object|null} rules - Validation rules JSON: { minLength, maxLength, pattern, min, max }
 * @returns {string|null} Error message or null if valid
 */
export function validateFieldValue(value, field, rules) {
  if (!rules || typeof rules !== 'object') {
    // Still validate type-specific constraints even without custom rules
    return validateType(value, field);
  }

  const typeError = validateType(value, field);
  if (typeError) return typeError;

  const { field_type } = field;

  if (field_type === 'text' || field_type === 'yesno') {
    const str = typeof value === 'string' ? value : String(value ?? '');
    if (rules.minLength != null && str.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength != null && str.length > rules.maxLength) {
      return `Must be at most ${rules.maxLength} characters`;
    }
    if (rules.pattern) {
      try {
        if (!new RegExp(rules.pattern).test(str)) {
          return 'Does not match required format';
        }
      } catch {
        // Invalid regex in rules — skip pattern check
      }
    }
  }

  if (field_type === 'number' || field_type === 'rating') {
    const num = typeof value === 'number' ? value : Number(value);
    if (rules.min != null && num < rules.min) {
      return `Must be at least ${rules.min}`;
    }
    if (rules.max != null && num > rules.max) {
      return `Must be at most ${rules.max}`;
    }
  }

  return null;
}

function validateType(value, field) {
  const { field_type } = field;

  if (field_type === 'date') {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value);
      if (isNaN(d.getTime())) return 'Please enter a valid date';
      return null;
    }
    return 'Please enter a valid date';
  }

  if ((field_type === 'select' || field_type === 'choice') && Array.isArray(field.options)) {
    if (!field.options.includes(value)) {
      return 'Please select a valid option';
    }
  }

  if (field_type === 'multiselect' && Array.isArray(field.options)) {
    if (!Array.isArray(value) || !value.every(v => field.options.includes(v))) {
      return 'Please select valid options';
    }
  }

  return null;
}

/**
 * Parse rules from field + form_field, with form_field overriding field defaults.
 */
export function resolveValidationRules(fieldRulesJson, formFieldRulesJson) {
  const base = safeParseJson(fieldRulesJson);
  const override = safeParseJson(formFieldRulesJson);
  if (!base && !override) return null;
  return { ...base, ...override };
}

function safeParseJson(val) {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/field-validation.test.js`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/field-validation.js src/lib/field-validation.test.js
git commit -m "feat: add shared field validation logic with type and rule checking"
```

---

### Task 4: Create Field Catalog API (`/api/admin/fields`)

**Files:**
- Create: `src/app/api/admin/fields/route.js`
- Create: `src/app/api/admin/fields/route.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/admin/fields/route.test.js`:

```js
const state = vi.hoisted(() => ({ db: null }));
const dbProxy = vi.hoisted(() => ({
  prepare: (...args) => state.db.prepare(...args),
  transaction: (...args) => state.db.transaction(...args),
}));

vi.mock('../../../../lib/db.js', () => ({
  default: dbProxy,
}));

import { GET, POST, PUT, DELETE } from '@/app/api/admin/fields/route';
import {
  closeTestDb,
  createAuthedRequestHeaders,
  createSessionForRank,
  createTestDb,
} from '@/test/integration/api-test-harness';

describe('/api/admin/fields', () => {
  beforeEach(() => { state.db = createTestDb(); });
  afterEach(() => { closeTestDb(state.db); state.db = null; });

  test('GET returns all fields grouped by scope', async () => {
    state.db.prepare(
      "INSERT INTO initiative (initiative_name) VALUES ('Reading')"
    ).run();
    state.db.prepare(
      "INSERT INTO field (field_key, field_label, field_type, scope) VALUES ('grade', 'Grade', 'text', 'common')"
    ).run();
    state.db.prepare(
      "INSERT INTO field (field_key, field_label, field_type, scope, initiative_id) VALUES ('reading_level', 'Reading Level', 'number', 'initiative_specific', 1)"
    ).run();

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.common).toHaveLength(1);
    expect(data.common[0].field_key).toBe('grade');
    expect(data.initiative_specific).toHaveLength(1);
    expect(data.initiative_specific[0].field_key).toBe('reading_level');
  });

  test('POST creates a common field', async () => {
    const { token, csrf } = createSessionForRank(state.db, 100);
    const headers = createAuthedRequestHeaders(token, csrf);

    const req = new Request('http://localhost/api/admin/fields', {
      method: 'POST',
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_key: 'school',
        field_label: 'School Name',
        field_type: 'text',
        scope: 'common',
        validation_rules: { maxLength: 200 },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.field_id).toBeDefined();
    expect(data.field_key).toBe('school');
    expect(data.validation_rules).toEqual({ maxLength: 200 });
  });

  test('POST creates an initiative-specific field with options', async () => {
    state.db.prepare("INSERT INTO initiative (initiative_name) VALUES ('Math')").run();
    const { token, csrf } = createSessionForRank(state.db, 100);
    const headers = createAuthedRequestHeaders(token, csrf);

    const req = new Request('http://localhost/api/admin/fields', {
      method: 'POST',
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_key: 'math_confidence',
        field_label: 'Math Confidence',
        field_type: 'select',
        scope: 'initiative_specific',
        initiative_id: 1,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.field_type).toBe('select');

    // Verify options were created
    const opts = state.db.prepare('SELECT * FROM field_options WHERE field_id = ? ORDER BY display_order').all(data.field_id);
    expect(opts).toHaveLength(3);
    expect(opts[0].option_value).toBe('low');
  });

  test('POST rejects initiative_specific field without initiative_id', async () => {
    const { token, csrf } = createSessionForRank(state.db, 100);
    const headers = createAuthedRequestHeaders(token, csrf);

    const req = new Request('http://localhost/api/admin/fields', {
      method: 'POST',
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_key: 'orphan_field',
        field_label: 'Orphan',
        field_type: 'text',
        scope: 'initiative_specific',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('PUT updates a field', async () => {
    state.db.prepare(
      "INSERT INTO field (field_key, field_label, field_type, scope) VALUES ('grade', 'Grade', 'text', 'common')"
    ).run();
    const { token, csrf } = createSessionForRank(state.db, 100);
    const headers = createAuthedRequestHeaders(token, csrf);

    const req = new Request('http://localhost/api/admin/fields?fieldId=1', {
      method: 'PUT',
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field_label: 'Student Grade',
        validation_rules: { maxLength: 50 },
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);

    const updated = state.db.prepare('SELECT * FROM field WHERE field_id = 1').get();
    expect(updated.field_label).toBe('Student Grade');
    expect(JSON.parse(updated.validation_rules)).toEqual({ maxLength: 50 });
  });

  test('DELETE removes a field and its options', async () => {
    const fieldId = Number(state.db.prepare(
      "INSERT INTO field (field_key, field_label, field_type, scope) VALUES ('temp', 'Temp', 'select', 'common')"
    ).run().lastInsertRowid);
    state.db.prepare(
      'INSERT INTO field_options (field_id, option_value, display_label, display_order) VALUES (?, ?, ?, ?)'
    ).run(fieldId, 'a', 'A', 0);

    const { token, csrf } = createSessionForRank(state.db, 100);
    const headers = createAuthedRequestHeaders(token, csrf);

    const req = new Request(`http://localhost/api/admin/fields?fieldId=${fieldId}`, {
      method: 'DELETE',
      headers: Object.fromEntries(headers.entries()),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const gone = state.db.prepare('SELECT * FROM field WHERE field_id = ?').get(fieldId);
    expect(gone).toBeUndefined();

    const opts = state.db.prepare('SELECT * FROM field_options WHERE field_id = ?').all(fieldId);
    expect(opts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/admin/fields/route.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the field catalog API**

Create `src/app/api/admin/fields/route.js`:

```js
import db from '../../../../lib/db.js';
import { requireAccess } from '@/lib/auth/server-auth';
import { logAudit } from '@/lib/audit';

const VALID_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'rating', 'json', 'yesno'];
const VALID_SCOPES = ['common', 'initiative_specific', 'staff_only'];

export async function GET() {
  const fields = db.prepare(`
    SELECT f.*, i.initiative_name
    FROM field f
    LEFT JOIN initiative i ON f.initiative_id = i.initiative_id
    ORDER BY f.scope, f.field_label
  `).all();

  const getOptions = db.prepare(
    'SELECT option_value, display_label, display_order FROM field_options WHERE field_id = ? ORDER BY display_order'
  );

  const enriched = fields.map(f => ({
    ...f,
    validation_rules: f.validation_rules ? JSON.parse(f.validation_rules) : null,
    options: getOptions.all(f.field_id),
  }));

  const grouped = {
    common: enriched.filter(f => f.scope === 'common'),
    initiative_specific: enriched.filter(f => f.scope === 'initiative_specific'),
    staff_only: enriched.filter(f => f.scope === 'staff_only'),
  };

  return new Response(JSON.stringify(grouped), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request) {
  const auth = requireAccess(request, db, { minAccessRank: 100 });
  if (auth.error) return auth.error;

  const body = await request.json();
  const { field_key, field_label, field_type, scope, initiative_id, options, validation_rules, is_filterable } = body;

  if (!field_key || !field_label || !field_type) {
    return new Response(JSON.stringify({ error: 'field_key, field_label, and field_type are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!VALID_TYPES.includes(field_type)) {
    return new Response(JSON.stringify({ error: `Invalid field_type. Must be one of: ${VALID_TYPES.join(', ')}` }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const effectiveScope = scope || 'common';
  if (!VALID_SCOPES.includes(effectiveScope)) {
    return new Response(JSON.stringify({ error: `Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}` }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (effectiveScope === 'initiative_specific' && !initiative_id) {
    return new Response(JSON.stringify({ error: 'initiative_id is required for initiative_specific fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const rulesJson = validation_rules ? JSON.stringify(validation_rules) : null;

  const createField = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO field (field_key, field_label, field_type, scope, initiative_id, is_filterable, is_required_default, validation_rules)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(field_key, field_label, field_type, effectiveScope, initiative_id || null, is_filterable ? 1 : 0, rulesJson);

    const fieldId = result.lastInsertRowid;

    if (Array.isArray(options) && options.length > 0) {
      const insertOpt = db.prepare(
        'INSERT INTO field_options (field_id, option_value, display_label, display_order) VALUES (?, ?, ?, ?)'
      );
      options.forEach((opt, idx) => {
        insertOpt.run(fieldId, opt.value || opt, opt.label || opt, idx);
      });
    }

    return fieldId;
  });

  try {
    const fieldId = createField();

    logAudit(db, {
      event: 'field.created',
      userEmail: auth.user.email,
      targetType: 'field',
      targetId: String(fieldId),
      payload: { field_key, field_type, scope: effectiveScope },
    });

    const created = db.prepare('SELECT * FROM field WHERE field_id = ?').get(fieldId);
    return new Response(JSON.stringify({
      ...created,
      validation_rules: created.validation_rules ? JSON.parse(created.validation_rules) : null,
    }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const isDuplicate = /UNIQUE constraint/.test(err.message);
    return new Response(JSON.stringify({ error: isDuplicate ? 'A field with this key already exists' : err.message }), {
      status: isDuplicate ? 409 : 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request) {
  const auth = requireAccess(request, db, { minAccessRank: 100 });
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const fieldId = Number(url.searchParams.get('fieldId'));
  if (!fieldId || Number.isNaN(fieldId)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fieldId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = db.prepare('SELECT * FROM field WHERE field_id = ?').get(fieldId);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Field not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const updates = {};
  if (body.field_label !== undefined) updates.field_label = body.field_label;
  if (body.field_type !== undefined && VALID_TYPES.includes(body.field_type)) updates.field_type = body.field_type;
  if (body.scope !== undefined && VALID_SCOPES.includes(body.scope)) updates.scope = body.scope;
  if (body.initiative_id !== undefined) updates.initiative_id = body.initiative_id;
  if (body.is_filterable !== undefined) updates.is_filterable = body.is_filterable ? 1 : 0;
  if (body.validation_rules !== undefined) updates.validation_rules = JSON.stringify(body.validation_rules);

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);

  db.prepare(`UPDATE field SET ${setClauses} WHERE field_id = ?`).run(...values, fieldId);

  // Update options if provided
  if (Array.isArray(body.options)) {
    db.prepare('DELETE FROM field_options WHERE field_id = ?').run(fieldId);
    const insertOpt = db.prepare(
      'INSERT INTO field_options (field_id, option_value, display_label, display_order) VALUES (?, ?, ?, ?)'
    );
    body.options.forEach((opt, idx) => {
      insertOpt.run(fieldId, opt.value || opt, opt.label || opt, idx);
    });
  }

  logAudit(db, {
    event: 'field.updated',
    userEmail: auth.user.email,
    targetType: 'field',
    targetId: String(fieldId),
    payload: updates,
  });

  const updated = db.prepare('SELECT * FROM field WHERE field_id = ?').get(fieldId);
  return new Response(JSON.stringify({
    ...updated,
    validation_rules: updated.validation_rules ? JSON.parse(updated.validation_rules) : null,
  }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE(request) {
  const auth = requireAccess(request, db, { minAccessRank: 100 });
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const fieldId = Number(url.searchParams.get('fieldId'));
  if (!fieldId || Number.isNaN(fieldId)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fieldId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = db.prepare('SELECT field_key FROM field WHERE field_id = ?').get(fieldId);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Field not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if field is used in any forms
  const usedIn = db.prepare('SELECT COUNT(*) as count FROM form_field WHERE field_id = ?').get(fieldId);
  if (usedIn.count > 0) {
    return new Response(JSON.stringify({
      error: 'Field is used in forms. Remove it from all forms before deleting.',
      used_in_forms: usedIn.count,
    }), {
      status: 409, headers: { 'Content-Type': 'application/json' },
    });
  }

  db.prepare('DELETE FROM field WHERE field_id = ?').run(fieldId);

  logAudit(db, {
    event: 'field.deleted',
    userEmail: auth.user.email,
    targetType: 'field',
    targetId: String(fieldId),
    payload: { field_key: existing.field_key },
  });

  return new Response(JSON.stringify({ success: true, fieldId }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/admin/fields/route.test.js`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/fields/route.js src/app/api/admin/fields/route.test.js
git commit -m "feat: add full CRUD field catalog API at /api/admin/fields"
```

---

### Task 5: Update template API to support initiative_id and scope

**Files:**
- Modify: `src/app/api/surveys/templates/route.js:55-163` (POST: accept initiative_id, scope, validation_rules, existing field_id)
- Modify: `src/app/api/surveys/templates/route.js:5-52` (GET: expose scope, initiative_id, validation_rules)

- [ ] **Step 1: Update the GET handler to expose field metadata**

In `src/app/api/surveys/templates/route.js`, update the query on line 14 to include scope, initiative_id, validation_rules:

```js
const getQuestions = db.prepare(`
  SELECT ff.form_field_id, f.field_id, f.field_label, f.field_type,
         ff.required, ff.help_text, f.scope, f.initiative_id,
         f.validation_rules AS field_rules, ff.validation_rules AS form_field_rules
  FROM form_field ff
  JOIN field f ON ff.field_id = f.field_id
  WHERE ff.form_id = ?
  ORDER BY ff.display_order
`);
```

Update the GET query on line 7 to include initiative_id:
```js
const forms = db.prepare(`
  SELECT form_id AS id, form_name AS title, description, created_at,
         is_published AS published, initiative_id
  FROM form
  WHERE is_published = 1
`).all();
```

Update the question mapping (line 31-41) to include the new fields:
```js
return {
  id: q.field_id,
  text: {
    question: q.field_label,
    type: q.field_type,
    required: !!q.required,
    scope: q.scope,
    initiative_id: q.initiative_id,
    validation_rules: resolveRules(q.field_rules, q.form_field_rules),
    ...(isOptionType && rawOptions ? { options: rawOptions } : {}),
    ...(isYesNo && rawOptions ? { subQuestions: rawOptions } : {}),
    ...(q.help_text ? { help_text: q.help_text } : {}),
  }
};
```

Add a helper at the top of the file:
```js
function resolveRules(fieldRulesJson, formFieldRulesJson) {
  const base = fieldRulesJson ? JSON.parse(fieldRulesJson) : null;
  const override = formFieldRulesJson ? JSON.parse(formFieldRulesJson) : null;
  if (!base && !override) return undefined;
  return { ...base, ...override };
}
```

Add `initiative_id` to the form response object (line 43-50):
```js
return {
  id: form.id,
  title: form.title,
  description: form.description,
  initiative_id: form.initiative_id,
  questions,
  createdAt: form.created_at,
  published: !!form.published
};
```

- [ ] **Step 2: Update the POST handler to accept initiative_id, scope, field_id, validation_rules**

In `src/app/api/surveys/templates/route.js`, update the POST handler:

```js
export async function POST(request) {
  try {
    const auth = requireAccess(request, db, { minAccessRank: 100 });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { title, description, questions, initiative_id } = body || {};
    if (!title || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const effectiveInitiativeId = initiative_id || 1;

    const now = new Date().toISOString();
    const insertForm = db.prepare(`
      INSERT INTO form (initiative_id, form_name, description, created_at, updated_at, updated_by_user_id, is_published)
      VALUES (?, ?, ?, ?, ?, NULL, 1)
    `);
    const insertField = db.prepare(`
      INSERT INTO field (field_key, field_label, field_type, scope, initiative_id, is_filterable, is_required_default, validation_rules)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    `);
    const insertFormField = db.prepare(`
      INSERT INTO form_field (form_id, field_id, display_order, required, is_hidden, help_text, validation_rules)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `);
    const insertOption = db.prepare(`
      INSERT INTO field_options (field_id, option_value, display_label, display_order)
      VALUES (?, ?, ?, ?)
    `);

    const createSurvey = db.transaction(() => {
      const result = insertForm.run(effectiveInitiativeId, title, description || '', now, now);
      const formId = result.lastInsertRowid;

      let displayOrder = 0;
      const questionObjs = [];

      for (const q of questions) {
        const textObj = typeof q === 'object' && q.text ? q.text : q;
        const fieldType = textObj.type || 'text';
        const required = textObj.required ? 1 : 0;
        const helpText = textObj.help_text || null;
        const scope = textObj.scope || 'common';
        const fieldInitiativeId = scope === 'initiative_specific' ? effectiveInitiativeId : null;
        const rulesJson = textObj.validation_rules ? JSON.stringify(textObj.validation_rules) : null;
        const formFieldRulesJson = textObj.form_validation_rules ? JSON.stringify(textObj.form_validation_rules) : null;

        let fieldId;

        // If an existing field_id is provided, reuse it from the catalog
        if (textObj.field_id) {
          const existingField = db.prepare('SELECT field_id FROM field WHERE field_id = ?').get(textObj.field_id);
          if (existingField) {
            fieldId = existingField.field_id;
          }
        }

        // Otherwise create a new field
        if (!fieldId) {
          const fieldKey = `${title}_${displayOrder}_${Date.now()}`;
          const fieldLabel = textObj.question || '';
          const fieldResult = insertField.run(fieldKey, fieldLabel, fieldType, scope, fieldInitiativeId, rulesJson);
          fieldId = fieldResult.lastInsertRowid;

          // Insert options for select/multiselect types
          if ((fieldType === 'select' || fieldType === 'choice' || fieldType === 'multiselect') && Array.isArray(textObj.options)) {
            textObj.options.forEach((opt, idx) => {
              insertOption.run(fieldId, opt, opt, idx);
            });
          }

          // Insert sub-questions for yesno type
          if (fieldType === 'yesno' && Array.isArray(textObj.subQuestions)) {
            textObj.subQuestions.forEach((sub, idx) => {
              insertOption.run(fieldId, sub, sub, idx);
            });
          }
        }

        // Link field to form
        insertFormField.run(formId, fieldId, displayOrder, required, helpText, formFieldRulesJson);

        questionObjs.push({
          id: fieldId,
          text: {
            question: textObj.question || '',
            type: fieldType,
            required: !!required,
            scope,
            ...(textObj.options ? { options: textObj.options } : {}),
            ...(textObj.subQuestions ? { subQuestions: textObj.subQuestions } : {}),
            ...(helpText ? { help_text: helpText } : {}),
          }
        });
        displayOrder++;
      }

      return { id: formId, title, description: description || '', questions: questionObjs, createdAt: now, published: true, initiative_id: effectiveInitiativeId };
    });

    const newSurvey = createSurvey();

    logAudit(db, {
      event: 'survey.created',
      userEmail: auth.user.email,
      targetType: 'survey',
      targetId: String(newSurvey.id),
      payload: { title, questionCount: questions.length, initiative_id: effectiveInitiativeId },
    });

    return new Response(JSON.stringify(newSurvey), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error('[surveys/templates POST] Error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
```

- [ ] **Step 3: Run existing tests plus manual verification**

Run: `npx vitest run src/app/api/surveys/templates/route.test.js`
Expected: All existing tests PASS (old payload format still works; `initiative_id` defaults to 1, `scope` defaults to `'common'`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/surveys/templates/route.js
git commit -m "feat: template API accepts initiative_id, scope, validation_rules, and reusable field_id"
```

---

### Task 6: Enforce validation rules on survey submission

**Files:**
- Modify: `src/lib/survey-validation.js` (add `validateTemplateAnswers`)
- Modify: `src/app/api/surveys/route.js:72-138` (call validation before normalized insert)

- [ ] **Step 1: Write the failing test**

Add tests to a new file `src/lib/survey-validation.test.js`:

```js
import { validateTemplateAnswers } from './survey-validation';

describe('validateTemplateAnswers', () => {
  const fields = [
    { field_id: 1, field_type: 'text', required: 1, field_rules: '{"maxLength":10}', form_field_rules: null },
    { field_id: 2, field_type: 'number', required: 1, field_rules: '{"min":0,"max":100}', form_field_rules: null },
    { field_id: 3, field_type: 'text', required: 0, field_rules: null, form_field_rules: null },
  ];

  test('returns no errors for valid answers', () => {
    const errors = validateTemplateAnswers({ 1: 'hello', 2: 50 }, fields);
    expect(errors).toHaveLength(0);
  });

  test('returns error for required missing field', () => {
    const errors = validateTemplateAnswers({ 2: 50 }, fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].field_id).toBe(1);
  });

  test('returns error for text exceeding maxLength', () => {
    const errors = validateTemplateAnswers({ 1: 'this is way too long', 2: 50 }, fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].field_id).toBe(1);
  });

  test('returns error for number out of range', () => {
    const errors = validateTemplateAnswers({ 1: 'ok', 2: 150 }, fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].field_id).toBe(2);
  });

  test('skips validation for optional empty fields', () => {
    const errors = validateTemplateAnswers({ 1: 'ok', 2: 50, 3: '' }, fields);
    expect(errors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/survey-validation.test.js`
Expected: FAIL — `validateTemplateAnswers` is not exported.

- [ ] **Step 3: Add `validateTemplateAnswers` to `src/lib/survey-validation.js`**

Append to the file:

```js
import { validateFieldValue, resolveValidationRules } from './field-validation';

/**
 * Validate template answers against field definitions.
 * @param {object} answers - { [field_id]: value }
 * @param {Array} fields - Array of { field_id, field_type, required, field_rules, form_field_rules }
 * @returns {Array<{ field_id: number, error: string }>}
 */
export function validateTemplateAnswers(answers, fields) {
  const errors = [];

  for (const field of fields) {
    const value = answers[field.field_id];
    const isEmpty = value === undefined || value === null || value === '';

    if (field.required && isEmpty) {
      errors.push({ field_id: field.field_id, error: 'This field is required' });
      continue;
    }

    if (isEmpty) continue;

    const rules = resolveValidationRules(field.field_rules, field.form_field_rules);
    const error = validateFieldValue(value, field, rules);
    if (error) {
      errors.push({ field_id: field.field_id, error });
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/survey-validation.test.js`
Expected: All PASS.

- [ ] **Step 5: Wire validation into the submission API**

In `src/app/api/surveys/route.js`, inside the normalized insert block (around line 76-78), after resolving the `formRow`, add validation:

```js
if (formRow && formRow.form_id) {
  const answers = cleaned.responses && cleaned.responses.templateAnswers ? cleaned.responses.templateAnswers : null;

  if (answers && Object.keys(answers).length > 0) {
    // Load field definitions for this form
    const formFields = db.prepare(`
      SELECT f.field_id, f.field_type, ff.required,
             f.validation_rules AS field_rules,
             ff.validation_rules AS form_field_rules
      FROM form_field ff
      JOIN field f ON ff.field_id = f.field_id
      WHERE ff.form_id = ?
    `).all(formRow.form_id);

    // Import at top of file: import { validateTemplateAnswers } from '@/lib/survey-validation';
    const validationErrors = validateTemplateAnswers(answers, formFields);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        field_errors: validationErrors,
      }, { status: 400 });
    }

    insertNormalized(formRow.form_id, formRow.initiative_id, answers);
  }
}
```

Add the import at the top of the file:
```js
import { validateTemplateAnswers } from '@/lib/survey-validation';
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/survey-validation.js src/lib/survey-validation.test.js src/app/api/surveys/route.js
git commit -m "feat: enforce field validation rules on survey submission"
```

---

### Task 7: Add missing field type renderers to public survey page

**Files:**
- Modify: `src/app/survey/page.js:620-825` (add `date`, `boolean`, `rating`, `select` renderers)

- [ ] **Step 1: Add `date` renderer after the `number` block (after line 670)**

```jsx
{questionType === 'date' && (
  <>
  <input
    type="date"
    value={templateResponses[qId] || ''}
    onChange={(e) => {
      setTemplateResponses({ ...templateResponses, [qId]: e.target.value });
      if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
    }}
    style={isInvalid ? invalidInputStyle : inputStyle}
  />
  {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>This field is required.</span>}
  </>
)}
```

- [ ] **Step 2: Add `boolean` renderer**

```jsx
{questionType === 'boolean' && (
  <>
  <div style={{ display: 'flex', gap: '1rem' }}>
    {['Yes', 'No'].map((opt) => (
      <label key={opt} style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
        border: templateResponses[qId] === (opt === 'Yes')
          ? '2px solid var(--color-asrs-orange)' : '1px solid var(--color-bg-tertiary)',
        backgroundColor: templateResponses[qId] === (opt === 'Yes')
          ? '#fdf4e8' : 'var(--color-bg-primary)',
      }}>
        <input type="radio" name={`question_${qId}`} value={opt}
          checked={templateResponses[qId] === (opt === 'Yes')}
          onChange={() => {
            setTemplateResponses({ ...templateResponses, [qId]: opt === 'Yes' });
            if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
          }}
          style={{ accentColor: 'var(--color-asrs-orange)' }}
        />
        <span>{opt}</span>
      </label>
    ))}
  </div>
  {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>This field is required.</span>}
  </>
)}
```

- [ ] **Step 3: Add `rating` renderer (1-5 scale)**

```jsx
{questionType === 'rating' && (
  <>
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => {
        setTemplateResponses({ ...templateResponses, [qId]: n });
        if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
      }} style={{
        width: '48px', height: '48px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.15s ease',
        border: templateResponses[qId] === n
          ? '2px solid var(--color-asrs-orange)' : '1px solid var(--color-bg-tertiary)',
        backgroundColor: templateResponses[qId] === n
          ? '#fdf4e8' : 'var(--color-bg-primary)',
        color: templateResponses[qId] === n
          ? 'var(--color-asrs-orange)' : 'var(--color-text-secondary)',
      }}>
        {n}
      </button>
    ))}
  </div>
  {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Please select a rating.</span>}
  </>
)}
```

- [ ] **Step 4: Add `select` type alias to the existing `choice` renderer (line 672)**

```jsx
{(questionType === 'choice' || questionType === 'select') && questionOptions.length > 0 && (
```

- [ ] **Step 5: Add `date`, `boolean`, `rating` to SurveyForm.js type dropdown**

In `src/components/SurveyForm.js` line 202-208, add new options:
```jsx
<select value={q.type} onChange={(e) => updateQuestion(i, 'type', e.target.value)} style={...}>
  <option value="text">Text Response</option>
  <option value="number">Numeric</option>
  <option value="date">Date</option>
  <option value="boolean">Yes / No</option>
  <option value="rating">Rating (1-5)</option>
  <option value="select">Multiple Choice</option>
  <option value="multiselect">Multi-select (select all that apply)</option>
  <option value="yesno">Yes / No Grid</option>
</select>
```

- [ ] **Step 6: Manually test in browser**

1. Navigate to `http://localhost:3000/survey` (as staff)
2. Create a template with `date`, `boolean`, `rating`, and `select` fields
3. Navigate to the public survey and confirm all render correctly
4. Submit and verify data is saved

- [ ] **Step 7: Commit**

```bash
git add src/app/survey/page.js src/components/SurveyForm.js
git commit -m "feat: add date, boolean, rating, select renderers to survey page and form builder"
```

---

### Task 8: Build out the Form Creation page

This is the biggest task — building the `/form-creation` page that lets admins compose forms from the field catalog.

**Files:**
- Modify: `src/app/form-creation/page.js` (replace placeholder with full form builder)

- [ ] **Step 1: Implement the form creation page**

Replace the content of `src/app/form-creation/page.js` with:

```jsx
'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';

export default function FormCreationPage() {
  const [userRole, setUserRole] = useState('staff');
  const [initiatives, setInitiatives] = useState([]);
  const [fieldCatalog, setFieldCatalog] = useState({ common: [], initiative_specific: [], staff_only: [] });
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState([]); // [{ field_id, required, help_text, validation_rules }]
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/initiatives').then(r => r.json()),
      apiFetch('/api/admin/fields').then(r => r.json()),
    ]).then(([initData, fieldData]) => {
      setInitiatives(Array.isArray(initData) ? initData : initData.initiatives || []);
      setFieldCatalog(fieldData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const availableFields = [
    ...fieldCatalog.common,
    ...fieldCatalog.initiative_specific.filter(f =>
      !selectedInitiative || f.initiative_id === Number(selectedInitiative)
    ),
  ];

  const addField = (field) => {
    if (selectedFields.some(sf => sf.field_id === field.field_id)) return;
    setSelectedFields([...selectedFields, {
      field_id: field.field_id,
      field_key: field.field_key,
      field_label: field.field_label,
      field_type: field.field_type,
      scope: field.scope,
      required: !!field.is_required_default,
      help_text: '',
      validation_rules: null,
    }]);
  };

  const removeField = (fieldId) => {
    setSelectedFields(selectedFields.filter(f => f.field_id !== fieldId));
  };

  const updateFieldConfig = (fieldId, key, value) => {
    setSelectedFields(selectedFields.map(f =>
      f.field_id === fieldId ? { ...f, [key]: value } : f
    ));
  };

  const moveField = (index, direction) => {
    const copy = [...selectedFields];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= copy.length) return;
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    setSelectedFields(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Please enter a form name');
    if (!selectedInitiative) return alert('Please select an initiative');
    if (selectedFields.length === 0) return alert('Please add at least one field');

    setSaving(true);
    try {
      const payload = {
        title: formName,
        description: formDescription,
        initiative_id: Number(selectedInitiative),
        questions: selectedFields.map(f => ({
          field_id: f.field_id,
          question: f.field_label,
          type: f.field_type,
          required: f.required,
          help_text: f.help_text || undefined,
          scope: f.scope,
          form_validation_rules: f.validation_rules || undefined,
        })),
      };

      const res = await apiFetch('/api/surveys/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Unknown error');
      alert('Form created successfully!');
      setFormName('');
      setFormDescription('');
      setSelectedFields([]);
    } catch (err) {
      alert('Error: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = { padding: '1.5rem', marginBottom: '1.5rem' };
  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' };
  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-bg-tertiary)', fontSize: '1rem' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header userRole={userRole} onRoleChange={setUserRole} />
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />
        <form onSubmit={handleSubmit}>
          {/* Form Details */}
          <div className="asrs-card" style={cardStyle}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Form Creation</h1>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Initiative *</label>
              <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)} required style={inputStyle}>
                <option value="">Select an initiative...</option>
                {initiatives.map(i => (
                  <option key={i.initiative_id || i.id} value={i.initiative_id || i.id}>
                    {i.initiative_name || i.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Form Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Student Experience Survey" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description of this form" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          {/* Field Catalog */}
          <div className="asrs-card" style={cardStyle}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Field Catalog</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Click a field to add it to your form. Common fields are shared across all initiatives.
              {selectedInitiative ? ' Initiative-specific fields for the selected initiative are also shown.' : ' Select an initiative to see initiative-specific fields.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableFields.map(f => {
                const isAdded = selectedFields.some(sf => sf.field_id === f.field_id);
                return (
                  <button key={f.field_id} type="button" onClick={() => addField(f)} disabled={isAdded}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: 20, fontSize: '0.875rem', cursor: isAdded ? 'default' : 'pointer',
                      border: `1px solid ${f.scope === 'common' ? 'var(--color-asrs-blue)' : 'var(--color-asrs-orange)'}`,
                      backgroundColor: isAdded ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                      color: isAdded ? 'var(--color-text-light)' : 'var(--color-text-primary)',
                      opacity: isAdded ? 0.5 : 1,
                    }}>
                    {f.field_label} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>({f.field_type})</span>
                    {f.scope === 'initiative_specific' && <span style={{ fontSize: '0.7rem', marginLeft: 4, color: 'var(--color-asrs-orange)' }}>initiative</span>}
                  </button>
                );
              })}
              {availableFields.length === 0 && (
                <p style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>No fields in catalog. Create fields first via the admin panel.</p>
              )}
            </div>
          </div>

          {/* Selected Fields */}
          <div className="asrs-card" style={cardStyle}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Form Fields ({selectedFields.length})
            </h2>

            {selectedFields.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
                No fields added yet. Select fields from the catalog above.
              </p>
            ) : (
              selectedFields.map((sf, idx) => (
                <div key={sf.field_id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                  marginBottom: '0.5rem', borderRadius: 8, border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                      className="asrs-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>^</button>
                    <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === selectedFields.length - 1}
                      className="asrs-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>v</button>
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{sf.field_label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginLeft: 8 }}>
                      {sf.field_type} | {sf.scope}
                    </span>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={sf.required} onChange={e => updateFieldConfig(sf.field_id, 'required', e.target.checked)} />
                    Required
                  </label>

                  <input placeholder="Help text" value={sf.help_text} onChange={e => updateFieldConfig(sf.field_id, 'help_text', e.target.value)}
                    style={{ width: 200, padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid var(--color-bg-tertiary)', fontSize: '0.85rem' }} />

                  <button type="button" onClick={() => removeField(sf.field_id)}
                    className="asrs-btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Remove</button>
                </div>
              ))
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="submit" disabled={saving} className="asrs-btn-primary" style={{ padding: '0.75rem 2rem' }}>
              {saving ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manually test in browser**

1. Navigate to `http://localhost:3000/form-creation`
2. Verify the initiative dropdown loads
3. Verify the field catalog loads (may be empty if no fields seeded — that's OK)
4. Add fields, reorder, mark required, set help text
5. Submit the form and verify it creates a template

- [ ] **Step 3: Commit**

```bash
git add src/app/form-creation/page.js
git commit -m "feat: build form creation page with field catalog browser and initiative scoping"
```

---

### Task 9: Add client-side validation rule enforcement in survey renderer

**Files:**
- Modify: `src/app/survey/page.js` (apply `validation_rules` from template data at submit time)

- [ ] **Step 1: Import validation helper**

At the top of `src/app/survey/page.js`, add:
```js
import { validateFieldValue, resolveValidationRules } from '@/lib/field-validation';
```

- [ ] **Step 2: Add client-side validation on submit**

In the submit handler, before sending the API call, iterate over the template questions and validate:

Find the submit handler (search for `handleSubmit` or the form `onSubmit`). Before the `apiFetch` call for template submissions, add:

```js
// Validate against field rules
if (surveyTemplate && surveyTemplate.questions) {
  const fieldErrors = {};
  for (const q of surveyTemplate.questions) {
    const qId = q.id;
    const value = templateResponses[qId];
    const questionType = q.type || q.text?.type || 'text';
    const isRequired = q.required ?? q.text?.required ?? true;
    const rules = q.validation_rules || q.text?.validation_rules || null;

    if (isRequired && (value === undefined || value === null || value === '')) {
      fieldErrors[`question_${qId}`] = true;
      continue;
    }

    if (value !== undefined && value !== null && value !== '' && rules) {
      const error = validateFieldValue(value, { field_type: questionType }, rules);
      if (error) {
        fieldErrors[`question_${qId}`] = true;
        // Optionally store error message for display
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    setInvalidFields(prev => ({ ...prev, ...fieldErrors }));
    return; // Stop submission
  }
}
```

- [ ] **Step 3: Manually test**

1. Create a template with a text field that has `maxLength: 5` via the API or form builder
2. Try submitting with a value longer than 5 characters
3. Confirm it blocks submission and highlights the field

- [ ] **Step 4: Commit**

```bash
git add src/app/survey/page.js
git commit -m "feat: enforce validation rules client-side in survey renderer"
```

---

## Summary of Requirement Coverage

| Requirement | Covered By |
|-------------|-----------|
| Define common fields across initiatives | Task 4 (field catalog API with `scope: 'common'`) + Task 8 (UI) |
| Define initiative-specific fields | Task 4 (`scope: 'initiative_specific'` + `initiative_id`) + Task 8 (filtered by initiative) |
| Set field validation rules | Task 2 (DB columns) + Task 3 (shared logic) + Task 4 (API accepts rules) + Task 6 (server enforcement) + Task 9 (client enforcement) |
| Configure field types | Task 1 (canonicalize types) + Task 7 (renderers for all types) + Task 4 (API validates type enum) |
| Admin form creation with field assignment | Task 5 (template API reuses field_id) + Task 8 (form builder page) |
