import { Pool } from 'pg';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // In production (Vercel), enable SSL; locally, disable it
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Track whether tables have been created this process lifetime
let _initialized = false;

/**
 * Create tables and indexes if they don't already exist.
 * Safe to call multiple times -- the first successful call sets the flag.
 */
async function initializeDatabase() {
  if (_initialized) return;

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        responses JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
        report_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_surveys_submitted_at ON surveys(submitted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_survey_id ON reports(survey_id);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    `);

    _initialized = true;
    console.log('[db] Database tables initialized');
  } finally {
    client.release();
  }
}

export { pool, initializeDatabase };
export default pool;
