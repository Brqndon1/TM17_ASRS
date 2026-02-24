//Database may be causing errors. 

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
      password TEXT NOT NULL,
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
      field_type TEXT NOT NULL CHECK (field_type IN ('text','number','date','boolean','select','multiselect','rating','json','choice')),
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
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by_user_id INTEGER REFERENCES user(user_id),
      is_published INTEGER NOT NULL DEFAULT 0
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

    -- QR code tables (US-011: generate QR codes for surveys/reports)

    CREATE TABLE IF NOT EXISTS qr_codes (
      qr_code_id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_key TEXT NOT NULL UNIQUE,
      qr_type TEXT NOT NULL CHECK (qr_type IN ('survey','report','survey_template')),
      target_id INTEGER,
      target_url TEXT NOT NULL,
      created_by_user_id INTEGER REFERENCES user(user_id),
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qr_scans (
      scan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id INTEGER NOT NULL REFERENCES qr_codes(qr_code_id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      converted_to_submission INTEGER,
      scanned_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_qr_codes_key ON qr_codes(qr_code_key);
    CREATE INDEX IF NOT EXISTS idx_qr_scans_code_id ON qr_scans(qr_code_id);
    CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at DESC);

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
      initiative_id INTEGER REFERENCES initiative(initiative_id),
      name TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('generating','completed','failed')),
      created_by TEXT DEFAULT '',
      report_data TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS report_generation_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER REFERENCES initiative(initiative_id),
      report_id INTEGER REFERENCES reports(id),
      status TEXT NOT NULL CHECK (status IN ('started','completed','failed')),
      duration_ms INTEGER NOT NULL DEFAULT 0,
      input_rows INTEGER NOT NULL DEFAULT 0,
      output_rows INTEGER NOT NULL DEFAULT 0,
      filters_count INTEGER NOT NULL DEFAULT 0,
      expressions_count INTEGER NOT NULL DEFAULT 0,
      sorts_count INTEGER NOT NULL DEFAULT 0,
      trend_variables_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Survey distribution table (US-010: distribute surveys with deadlines)

    CREATE TABLE IF NOT EXISTS survey_distribution (
      distribution_id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_template_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','closed')),
      recipient_emails TEXT NOT NULL DEFAULT '[]',
      response_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      created_by_user_id INTEGER REFERENCES user(user_id)
    );

    -- Initiative goals table (US-014: set goals with scoring criteria)

    CREATE TABLE IF NOT EXISTS initiative_goal (
      goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id) ON DELETE CASCADE,
      goal_name TEXT NOT NULL,
      description TEXT,
      target_metric TEXT NOT NULL,
      target_value REAL NOT NULL,
      current_value REAL NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 1.0,
      scoring_method TEXT NOT NULL DEFAULT 'linear'
        CHECK (scoring_method IN ('linear','threshold','binary')),
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by_user_id INTEGER REFERENCES user(user_id)
    );

    -- Categories table (global categories for organizing data)

    CREATE TABLE IF NOT EXISTS category (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Junction table for many-to-many relationship between initiatives and categories

    CREATE TABLE IF NOT EXISTS initiative_category (
      initiative_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER NOT NULL REFERENCES initiative(initiative_id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES category(category_id) ON DELETE CASCADE,
      added_at TEXT DEFAULT (datetime('now')),
      UNIQUE(initiative_id, category_id)
    );

    -- Indexes

    CREATE INDEX IF NOT EXISTS idx_goal_initiative ON initiative_goal(initiative_id);
    CREATE INDEX IF NOT EXISTS idx_category_name ON category(category_name);
    CREATE INDEX IF NOT EXISTS idx_initiative_category_initiative ON initiative_category(initiative_id);
    CREATE INDEX IF NOT EXISTS idx_initiative_category_category ON initiative_category(category_id);
    CREATE INDEX IF NOT EXISTS idx_submission_initiative_date ON submission(initiative_id, submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submission_form_date ON submission(form_id, submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submission_value_submission ON submission_value(submission_id);
    CREATE INDEX IF NOT EXISTS idx_submission_value_field ON submission_value(field_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_form_field_unique ON form_field(form_id, field_id);
    CREATE INDEX IF NOT EXISTS idx_surveys_submitted_at ON surveys(submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_survey_id ON reports(survey_id);
    CREATE INDEX IF NOT EXISTS idx_reports_initiative_id ON reports(initiative_id);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_report_generation_log_created_at ON report_generation_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_report_generation_log_status ON report_generation_log(status);
    CREATE INDEX IF NOT EXISTS idx_distribution_status ON survey_distribution(status);
    CREATE INDEX IF NOT EXISTS idx_distribution_dates ON survey_distribution(start_date, end_date);
  `);

  // ── Seed survey templates from surveys.json if no forms exist ─────────────
  function seedSurveysFromJson() {
    const formsCount = db.prepare('SELECT COUNT(*) as count FROM form').get().count;
    if (formsCount > 0) return;
    const surveysPath = path.join(process.cwd(), 'src', 'data', 'surveys.json');
    if (!fs.existsSync(surveysPath)) return;
    let surveys;
    try {
      surveys = JSON.parse(fs.readFileSync(surveysPath, 'utf-8'));
    } catch (e) {
      console.warn('[db] Could not parse surveys.json:', e.message);
      return;
    }
    if (!Array.isArray(surveys)) return;
    const insertFormSeed = db.prepare('INSERT INTO form (form_name, description, is_published) VALUES (?, ?, 1)');
    const insertFieldSeed = db.prepare('INSERT INTO field (field_key, field_label, field_type, scope, is_filterable) VALUES (?, ?, ?, ?, 0)');
    const insertFormFieldSeed = db.prepare('INSERT INTO form_field (form_id, field_id, display_order, required) VALUES (?, ?, ?, 1)');
    const insertFieldOptionSeed = db.prepare('INSERT INTO field_options (field_id, option_value, display_label, display_order) VALUES (?, ?, ?, ?)');
    for (const survey of surveys) {
      const formInfo = insertFormSeed.run(survey.title || 'Untitled Survey', survey.description || '');
      const formId = formInfo.lastInsertRowid;
      let order = 0;
      for (const q of survey.questions || []) {
        const fieldKey = q.id || q.question || 'q' + order;
        const fieldLabel = q.question || (q.text && q.text.question) || 'Question ' + (order + 1);
        const fieldType = q.type || (q.text && q.text.type) || 'text';
        const fieldInfo = insertFieldSeed.run(String(fieldKey), fieldLabel, fieldType, 'common');
        const fieldId = fieldInfo.lastInsertRowid;
        insertFormFieldSeed.run(formId, fieldId, order);
        const opts = q.options || (q.text && q.text.options) || [];
        if ((fieldType === 'choice' || fieldType === 'select') && opts.length > 0) {
          let optOrder = 0;
          for (const opt of opts) {
            insertFieldOptionSeed.run(fieldId, opt, opt, optOrder++);
          }
        }
        order++;
      }
    }
    console.log('[db] Seeded survey templates from surveys.json');
  }
  seedSurveysFromJson();

  // ── Seed data ────────────────────────────────────────

  function addColumnIfNotExists(table, columnDef) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        throw err;
      }
    }
  }
  // Add new initiative columns if they don't exist
  addColumnIfNotExists('initiative', 'description TEXT');
  addColumnIfNotExists('initiative', "attributes TEXT DEFAULT '[]'");
  addColumnIfNotExists('initiative', "questions TEXT DEFAULT '[]'");
  addColumnIfNotExists('initiative', "settings TEXT DEFAULT '{}'");
  addColumnIfNotExists('initiative', 'summary_json TEXT');
  addColumnIfNotExists('initiative', 'chart_data_json TEXT');

  // Add deadline column to goals if it doesn't exist
  addColumnIfNotExists('initiative_goal', 'deadline TEXT');

  // Add display_order column to reports if it doesn't exist (US-022)
  addColumnIfNotExists('reports', 'display_order INTEGER NOT NULL DEFAULT 0');

  const insertUserType = db.prepare(
    'INSERT OR IGNORE INTO user_type (type, access_rank) VALUES (?, ?)'
  );
  insertUserType.run('public', 10);
  insertUserType.run('staff', 50);
  insertUserType.run('admin', 100);

  // ── Seed initiative data from JSON files ──────────────
  function toCamelKey(displayName) {
    const words = displayName.trim().split(/\s+/);
    return words
      .map((w, i) => i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  const seedDataDir = path.join(process.cwd(), 'src', 'data');
  let initiativesJson = { initiatives: [] };
  let reportDataJson = { reports: {} };
  try {
    initiativesJson = JSON.parse(fs.readFileSync(path.join(seedDataDir, 'initiatives.json'), 'utf-8'));
    reportDataJson = JSON.parse(fs.readFileSync(path.join(seedDataDir, 'reportData.json'), 'utf-8'));
  } catch (e) {
    console.warn('[db] Could not load seed JSON files:', e.message);
  }

  // Upsert the 7 core initiatives with real data
  for (const init of initiativesJson.initiatives.slice(0, 7)) {
    const report = reportDataJson.reports[String(init.id)];
    const summaryJson = report ? JSON.stringify(report.summary) : null;
    const chartDataJson = report ? JSON.stringify(report.chartData) : null;
    const attrs = JSON.stringify(init.attributes || []);
    const desc = init.description || '';
    try {
      const exists = db.prepare('SELECT 1 FROM initiative WHERE initiative_id = ?').get(init.id);
      if (exists) {
        db.prepare(
          'UPDATE initiative SET initiative_name=?, description=?, attributes=?, summary_json=?, chart_data_json=? WHERE initiative_id=?'
        ).run(init.name, desc, attrs, summaryJson, chartDataJson, init.id);
      } else {
        db.prepare(
          'INSERT INTO initiative (initiative_id, initiative_name, description, attributes, summary_json, chart_data_json) VALUES (?,?,?,?,?,?)'
        ).run(init.id, init.name, desc, attrs, summaryJson, chartDataJson);
      }
    } catch (e) {
      console.warn(`[db] Could not upsert initiative ${init.id}:`, e.message);
    }
  }

  // ── Seed fields (unique field definitions) ──────────────
  const insertField = db.prepare(
    'INSERT OR IGNORE INTO field (field_key, field_label, field_type, scope, is_filterable) VALUES (?,?,?,?,?)'
  );
  insertField.run('grade', 'Grade', 'text', 'common', 1);
  insertField.run('school', 'School', 'text', 'common', 1);

  for (const [initId, report] of Object.entries(reportDataJson.reports)) {
    if (!report.tableData || report.tableData.length === 0) continue;
    const init = initiativesJson.initiatives.find(i => i.id === Number(initId));
    const sampleRow = report.tableData[0];
    for (const key of Object.keys(sampleRow)) {
      if (key === 'id' || key === 'grade' || key === 'school') continue;
      const label = init?.attributes?.find(a => toCamelKey(a) === key) || key;
      const fieldType = typeof sampleRow[key] === 'number' ? 'number' : 'text';
      insertField.run(key, label, fieldType, 'initiative_specific', 1);
    }
  }

  // ── Seed forms (1 per initiative) ──────────────────────
  const insertForm = db.prepare(
    'INSERT OR IGNORE INTO form (form_id, initiative_id, form_name) VALUES (?,?,?)'
  );
  for (const [initId] of Object.entries(reportDataJson.reports)) {
    const init = initiativesJson.initiatives.find(i => i.id === Number(initId));
    insertForm.run(Number(initId), Number(initId), `${init?.name || 'Initiative ' + initId} Survey`);
  }

  // ── Seed form_field (link fields to forms) ──────────────
  const getFieldId = db.prepare('SELECT field_id FROM field WHERE field_key = ?');
  const insertFormField = db.prepare(
    'INSERT OR IGNORE INTO form_field (form_id, field_id, display_order) VALUES (?,?,?)'
  );
  for (const [initId, report] of Object.entries(reportDataJson.reports)) {
    if (!report.tableData || report.tableData.length === 0) continue;
    const sampleRow = report.tableData[0];
    let order = 0;
    for (const key of Object.keys(sampleRow)) {
      if (key === 'id') continue;
      const fieldRow = getFieldId.get(key);
      if (fieldRow) {
        insertFormField.run(Number(initId), fieldRow.field_id, order++);
      }
    }
  }

  // ── Seed submissions + submission_values ────────────────
  const insertSubmission = db.prepare(
    'INSERT OR IGNORE INTO submission (submission_id, initiative_id, form_id) VALUES (?,?,?)'
  );
  const insertSubValue = db.prepare(
    'INSERT OR IGNORE INTO submission_value (submission_id, field_id, value_text, value_number) VALUES (?,?,?,?)'
  );

  let nextSubId = 1;
  for (const [initId, report] of Object.entries(reportDataJson.reports)) {
    if (!report.tableData) continue;
    for (const row of report.tableData) {
      insertSubmission.run(nextSubId, Number(initId), Number(initId));
      for (const [key, value] of Object.entries(row)) {
        if (key === 'id') continue;
        const fieldRow = getFieldId.get(key);
        if (!fieldRow) continue;
        const numVal = typeof value === 'number' ? value : null;
        insertSubValue.run(nextSubId, fieldRow.field_id, String(value), numVal);
      }
      nextSubId++;
    }
  }

  const insertFeature = db.prepare(
    'INSERT OR IGNORE INTO feature (key, name, description) VALUES (?, ?, ?)'
  );
  insertFeature.run('FORM_VIEW', 'View Forms', 'View and fill out forms');
  insertFeature.run('FORM_EDIT', 'Edit Forms', 'Create and edit form definitions');
  insertFeature.run('REPORT_VIEW', 'View Reports', 'View generated reports');
  insertFeature.run('REPORT_CREATE_DEFAULT', 'Create Reports', 'Create and run report templates');
  insertFeature.run('ADMIN_USERS', 'Manage Users', 'Manage user accounts and permissions');
  insertFeature.run('GOAL_MANAGE', 'Manage Goals', 'Set and manage initiative goals with scoring criteria');
  insertFeature.run('REPORT_MANAGE', 'Manage Reports', 'Add, update, delete, and reorder reports');

  // Set feature access ranks
  const featureRows = db.prepare('SELECT feature_id, key FROM feature').all();
  const rankMap = {
    FORM_VIEW: 1,
    FORM_EDIT: 50,
    REPORT_VIEW: 10,
    REPORT_CREATE_DEFAULT: 50,
    ADMIN_USERS: 100,
    GOAL_MANAGE: 100,
    REPORT_MANAGE: 50,
  };
  const insertAccess = db.prepare(
    'INSERT OR IGNORE INTO feature_access (feature_id, min_access_rank) VALUES (?, ?)'
  );
  for (const row of featureRows) {
    if (rankMap[row.key] !== undefined) {
      insertAccess.run(row.feature_id, rankMap[row.key]);
    }
  }

  // ── Seed test accounts ──────────────────────────────
  // These are auto-created so teammates can log in immediately after cloning.
  // The /data directory is gitignored, so the DB is recreated locally for each dev.

  const adminType = db.prepare("SELECT user_type_id FROM user_type WHERE type = 'admin'").get();
  const staffType = db.prepare("SELECT user_type_id FROM user_type WHERE type = 'staff'").get();

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO user (first_name, last_name, email, password, user_type_id) VALUES (?, ?, ?, ?, ?)'
  );
  if (adminType) {
    insertUser.run('Test', 'Admin', 'admin@test.com', 'admin123', adminType.user_type_id);
  }
  if (staffType) {
    insertUser.run('Test', 'Staff', 'staff@test.com', 'staff123', staffType.user_type_id);
  }

  _initialized = true;
  console.log('[db] SQLite database initialized at', DB_PATH);
}

export { db, initializeDatabase };
export default db;
