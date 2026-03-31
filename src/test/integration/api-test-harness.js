import Database from 'better-sqlite3';
import { createSession, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from '@/lib/auth/server-auth';

export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE user_type (
      user_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE,
      access_rank INTEGER NOT NULL
    );

    CREATE TABLE user (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type_id INTEGER NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      verified INTEGER NOT NULL DEFAULT 1,
      verification_token TEXT,
      token_expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_type_id) REFERENCES user_type(user_type_id)
    );

    CREATE TABLE session (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      csrf_token TEXT,
      created_at TEXT,
      last_seen_at TEXT,
      expires_at TEXT,
      absolute_expires_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES user(user_id)
    );

    CREATE TABLE initiative (
      initiative_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_name TEXT NOT NULL UNIQUE,
      description TEXT,
      summary_json TEXT,
      chart_data_json TEXT,
      attributes TEXT,
      questions TEXT,
      settings TEXT
    );

    CREATE TABLE category (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE initiative_category (
      initiative_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (initiative_id) REFERENCES initiative(initiative_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE CASCADE,
      UNIQUE(initiative_id, category_id)
    );

    CREATE TABLE form (
      form_id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER,
      form_name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_by_user_id INTEGER,
      is_published INTEGER NOT NULL DEFAULT 0
    );

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

    CREATE TABLE field_options (
      field_option_id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL,
      option_value TEXT NOT NULL,
      display_label TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (field_id) REFERENCES field(field_id) ON DELETE CASCADE
    );

    CREATE TABLE surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      responses TEXT NOT NULL,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiative_id INTEGER,
      survey_id INTEGER,
      name TEXT,
      description TEXT,
      status TEXT,
      report_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      filters_json TEXT,
      expressions_json TEXT,
      sort_config_json TEXT,
      attributes_json TEXT,
      trend_config_json TEXT,
      metrics_json TEXT,
      data_snapshot_json TEXT,
      trends_json TEXT,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (initiative_id) REFERENCES initiative(initiative_id),
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );

    CREATE TABLE qr_codes (
      qr_code_id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_key TEXT NOT NULL UNIQUE,
      qr_type TEXT,
      target_id INTEGER,
      target_url TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT
    );

    CREATE TABLE qr_scans (
      scan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id INTEGER NOT NULL,
      scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      converted_to_submission INTEGER,
      FOREIGN KEY (qr_code_id) REFERENCES qr_codes(qr_code_id) ON DELETE CASCADE
    );
  `);

  db.prepare(`INSERT INTO user_type (type, access_rank) VALUES ('public', 10), ('staff', 50), ('admin', 100)`).run();

  return db;
}

export function closeTestDb(db) {
  if (db && db.open) db.close();
}

export function insertInitiative(db, overrides = {}) {
  const initiative = {
    initiative_name: overrides.initiative_name || 'Initiative A',
    description: overrides.description || 'Desc',
    attributes: JSON.stringify(overrides.attributes || []),
    questions: JSON.stringify(overrides.questions || []),
    settings: JSON.stringify(overrides.settings || {}),
  };

  const result = db.prepare(
    'INSERT INTO initiative (initiative_name, description, attributes, questions, settings) VALUES (?, ?, ?, ?, ?)'
  ).run(
    initiative.initiative_name,
    initiative.description,
    initiative.attributes,
    initiative.questions,
    initiative.settings
  );

  return Number(result.lastInsertRowid);
}

export function insertCategory(db, name = 'Category A') {
  const result = db.prepare(
    'INSERT INTO category (category_name, description) VALUES (?, ?)'
  ).run(name, `${name} desc`);
  return Number(result.lastInsertRowid);
}

export function insertQrCode(db, overrides = {}) {
  const result = db.prepare(`
    INSERT INTO qr_codes (qr_code_key, qr_type, target_id, target_url, description, created_by_user_id, is_active, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    overrides.qrCodeKey || 'qr_test_1',
    overrides.qrType || 'survey',
    overrides.targetId || 1,
    overrides.targetUrl || 'http://localhost:3000/survey/1',
    overrides.description || 'test qr',
    overrides.createdByUserId || 1,
    overrides.isActive ?? 1,
    overrides.expiresAt || null
  );
  return Number(result.lastInsertRowid);
}

export function insertReport(db, overrides = {}) {
  const initiativeId = overrides.initiative_id || insertInitiative(db);
  const result = db.prepare(`
    INSERT INTO reports (initiative_id, name, description, status, filters_json, expressions_json, sort_config_json, attributes_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    initiativeId,
    overrides.name || 'Report A',
    overrides.description || 'Report desc',
    overrides.status || 'completed',
    JSON.stringify(overrides.filters || {}),
    JSON.stringify(overrides.expressions || []),
    JSON.stringify(overrides.sortConfig || []),
    JSON.stringify(overrides.attributes || ['Score'])
  );
  return Number(result.lastInsertRowid);
}

export function createAuthedRequestHeaders(tokens, { csrf = false } = {}) {
  const headers = {
    cookie: `${SESSION_COOKIE_NAME}=${tokens.token}; ${CSRF_COOKIE_NAME}=${tokens.csrfToken}`,
  };

  if (csrf) headers['x-csrf-token'] = tokens.csrfToken;
  return headers;
}

export function createSessionForRank(db, { rank = 50, verified = 1 } = {}) {
  const type = rank >= 100 ? 'admin' : rank >= 50 ? 'staff' : 'public';
  const userType = db.prepare('SELECT user_type_id, access_rank FROM user_type WHERE type = ?').get(type);

  const email = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.local`;
  const userResult = db.prepare(`
    INSERT INTO user (user_type_id, first_name, last_name, email, password, verified)
    VALUES (?, 'Test', 'User', ?, 'x', ?)
  `).run(userType.user_type_id, email, verified);

  const userId = Number(userResult.lastInsertRowid);
  return createSession(db, userId);
}
