import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Store the database file in <project>/data/asrs.db
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'asrs.db');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Open (or create) the database — WAL mode for better concurrent read performance
const db = Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Track whether tables have been created this process lifetime
let _initialized = false;

/**
 * Create all tables, indexes, and seed data if they don't already exist.
 * Covers the full ASRS schema (design doc) plus the legacy survey tables.
 * Safe to call multiple times — the first successful call sets the flag.
 */
function initializeDatabase() {
  if (_initialized) return;

  // ── Design-doc tables ──────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_type (
      user_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE,
      access_rank INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone_number TEXT,
      user_type_id INTEGER REFERENCES user_type(user_type_id)
    );

    CREATE TABLE IF NOT EXISTS initiative (
      initiative_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS field (
      field_id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_key TEXT NOT NULL UNIQUE,
      field_label TEXT NOT NULL,
      field_type TEXT NOT NULL CHECK (field_type IN ('text','number','date','boolean','select','multiselect','rating','json')),
      scope TEXT NOT NULL DEFAULT 'common' CHECK (scope IN ('common','initiative_specific','staff_only')),
      initiative_id INTEGER REFERENCES initiative(initiative_id),
      is_filterable INTEGER NOT NULL DEFAULT 0,
      is_required_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS field_options (
      field_option_id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL REFERENCES field(field_id) ON DELETE CASCADE,
      option_value TEXT NOT NULL,
      display_label TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS form (
      form_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id),
      form_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by_user_id INTEGER REFERENCES user(user_id)
    );

    CREATE TABLE IF NOT EXISTS form_field (
      form_field_id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL REFERENCES form(form_id) ON DELETE CASCADE,
      field_id INTEGER NOT NULL REFERENCES field(field_id),
      display_order INTEGER NOT NULL DEFAULT 0,
      required INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      help_text TEXT
    );

    CREATE TABLE IF NOT EXISTS submission (
      submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id),
      form_id INTEGER NOT NULL REFERENCES form(form_id),
      submitted_at TEXT DEFAULT (datetime('now')),
      submitted_by_user_id INTEGER REFERENCES user(user_id)
    );

    CREATE TABLE IF NOT EXISTS submission_value (
      submission_value_id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submission(submission_id) ON DELETE CASCADE,
      field_id INTEGER NOT NULL REFERENCES field(field_id),
      value_text TEXT,
      value_number REAL,
      value_date TEXT,
      value_bool INTEGER,
      value_json TEXT,
      UNIQUE(submission_id, field_id)
    );

    CREATE TABLE IF NOT EXISTS report_template (
      report_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id),
      template_name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_by_user_id INTEGER REFERENCES user(user_id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      config_json TEXT NOT NULL DEFAULT '{}',
      form_id INTEGER REFERENCES form(form_id)
    );

    CREATE TABLE IF NOT EXISTS report_generation (
      report_generation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_template_id INTEGER NOT NULL REFERENCES report_template(report_template_id),
      run_by_user_id INTEGER REFERENCES user(user_id),
      run_at TEXT DEFAULT (datetime('now')),
      output_ref TEXT
    );

    CREATE TABLE IF NOT EXISTS feature (
      feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS feature_access (
      feature_access_id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_id INTEGER NOT NULL UNIQUE REFERENCES feature(feature_id),
      min_access_rank INTEGER NOT NULL DEFAULT 1
    );

    -- Legacy tables (current /api/surveys and /api/reports routes)

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      responses TEXT NOT NULL,
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
      report_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes

    CREATE INDEX IF NOT EXISTS idx_submission_initiative_date ON submission(initiative_id, submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submission_form_date ON submission(form_id, submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submission_value_submission ON submission_value(submission_id);
    CREATE INDEX IF NOT EXISTS idx_submission_value_field ON submission_value(field_id);
    CREATE INDEX IF NOT EXISTS idx_surveys_submitted_at ON surveys(submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_survey_id ON reports(survey_id);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
  `);

  // ── Seed data ────────────────────────────────────────

  const insertUserType = db.prepare(
    'INSERT OR IGNORE INTO user_type (type, access_rank) VALUES (?, ?)'
  );
  insertUserType.run('public', 10);
  insertUserType.run('staff', 50);
  insertUserType.run('admin', 100);

  const insertInitiative = db.prepare(
    'INSERT OR IGNORE INTO initiative (initiative_name) VALUES (?)'
  );
  for (const name of [
    'Sustainability',
    'Community Engagement',
    'Academic Excellence',
    'Research & Innovation',
    'Student Success',
    'Infrastructure',
    'Diversity & Inclusion',
  ]) {
    insertInitiative.run(name);
  }

  const insertFeature = db.prepare(
    'INSERT OR IGNORE INTO feature (key, name, description) VALUES (?, ?, ?)'
  );
  insertFeature.run('FORM_VIEW', 'View Forms', 'View and fill out forms');
  insertFeature.run('FORM_EDIT', 'Edit Forms', 'Create and edit form definitions');
  insertFeature.run('REPORT_VIEW', 'View Reports', 'View generated reports');
  insertFeature.run('REPORT_CREATE_DEFAULT', 'Create Reports', 'Create and run report templates');
  insertFeature.run('ADMIN_USERS', 'Manage Users', 'Manage user accounts and permissions');

  // Set feature access ranks
  const featureRows = db.prepare('SELECT feature_id, key FROM feature').all();
  const rankMap = {
    FORM_VIEW: 1,
    FORM_EDIT: 50,
    REPORT_VIEW: 10,
    REPORT_CREATE_DEFAULT: 50,
    ADMIN_USERS: 100,
  };
  const insertAccess = db.prepare(
    'INSERT OR IGNORE INTO feature_access (feature_id, min_access_rank) VALUES (?, ?)'
  );
  for (const row of featureRows) {
    if (rankMap[row.key] !== undefined) {
      insertAccess.run(row.feature_id, rankMap[row.key]);
    }
  }

  _initialized = true;
  console.log('[db] SQLite database initialized at', DB_PATH);
}

export { db, initializeDatabase };
export default db;
