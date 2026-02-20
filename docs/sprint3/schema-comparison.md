# Schema Comparison: surveys.json vs SQLite Database

## 1. Fields in src/data/surveys.json

Each survey object:
- `id` (string/number)
- `title` (string)
- `description` (string)
- `questions` (array of objects)
  - Each question:
    - `id` (number)
    - `text` (object)
      - `question` (string)
      - `type` (string)
      - `required` (boolean, optional)
      - `options` (array of strings, optional)
- `createdAt` (string, ISO date)
- `published` (boolean)

## 2. Relevant DB Tables and Columns

### form
- form_id INTEGER PRIMARY KEY AUTOINCREMENT
- initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id)
- form_name TEXT NOT NULL
- description TEXT
- created_at TEXT DEFAULT (datetime('now'))
- updated_at TEXT DEFAULT (datetime('now'))
- updated_by_user_id INTEGER REFERENCES user(user_id)
- is_published INTEGER NOT NULL DEFAULT 0

### form_field
- form_field_id INTEGER PRIMARY KEY AUTOINCREMENT
- form_id INTEGER NOT NULL REFERENCES form(form_id) ON DELETE CASCADE
- field_id INTEGER NOT NULL REFERENCES field(field_id)
- display_order INTEGER NOT NULL DEFAULT 0
- required INTEGER NOT NULL DEFAULT 0
- is_hidden INTEGER NOT NULL DEFAULT 0
- help_text TEXT

### field
- field_id INTEGER PRIMARY KEY AUTOINCREMENT
- field_key TEXT NOT NULL UNIQUE
- field_label TEXT NOT NULL
- field_type TEXT NOT NULL CHECK (...)
- scope TEXT NOT NULL DEFAULT 'common'
- initiative_id INTEGER REFERENCES initiative(initiative_id)
- is_filterable INTEGER NOT NULL DEFAULT 0
- is_required_default INTEGER NOT NULL DEFAULT 0

### field_options
- field_option_id INTEGER PRIMARY KEY AUTOINCREMENT
- field_id INTEGER NOT NULL REFERENCES field(field_id) ON DELETE CASCADE
- option_value TEXT NOT NULL
- display_label TEXT NOT NULL
- display_order INTEGER NOT NULL DEFAULT 0

## 3. Field Mapping

| JSON Field                | DB Table/Column         |
|--------------------------|------------------------|
| id (survey)               | form.form_id           |
| title                     | form.form_name         |
| description               | form.description       |
| createdAt                 | form.created_at        |
| published                 | form.is_published      |
| questions[].id            | field.field_id         |
| questions[].text.question | field.field_label      |
| questions[].text.type     | field.field_type       |
| questions[].text.required | form_field.required    |
| questions[].text.options  | field_options          |
| questions[].help_text     | form_field.help_text   |

## 4. Gaps Found

- `description` was missing from the form table (added)
- `is_published` was missing from the form table (added)
- `initiative_id` is required in DB but not present in JSON, will need default handling during migration
- `scope`, `is_filterable`, `is_required_default` in field table need defaults during migration
- `options` in JSON need transformation to fit field_options table structure
