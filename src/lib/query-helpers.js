import { initializeDatabase, db } from '@/lib/db';

/**
 * queryTableData — Pivots EAV submission_value rows into flat table rows
 * for a given initiative.
 *
 * Returns rows like: [{ id: 1, grade: "7th", school: "Lincoln MS", ... }]
 */
export function queryTableData(database, initiativeId) {
  // Look up the fields linked to this initiative's form
  const fields = database.prepare(`
    SELECT f.field_id, f.field_key, f.field_type
    FROM field f
    JOIN form_field ff ON ff.field_id = f.field_id
    JOIN form fm ON fm.form_id = ff.form_id
    WHERE fm.initiative_id = ?
    ORDER BY ff.display_order
  `).all(initiativeId);

  if (fields.length === 0) return [];

  // Build dynamic pivot columns: MAX(CASE WHEN sv.field_id = ? THEN ... END) AS key
  const pivotCols = fields.map(f => {
    const valCol = f.field_type === 'number' ? 'sv.value_number' : 'sv.value_text';
    return `MAX(CASE WHEN sv.field_id = ${f.field_id} THEN ${valCol} END) AS [${f.field_key}]`;
  }).join(',\n    ');

  const sql = `
    SELECT s.submission_id AS id,
    ${pivotCols}
    FROM submission s
    JOIN submission_value sv ON sv.submission_id = s.submission_id
    WHERE s.initiative_id = ?
    GROUP BY s.submission_id
    ORDER BY s.submission_id
  `;

  return database.prepare(sql).all(initiativeId);
}
