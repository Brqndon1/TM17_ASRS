/**
 * Seed: E-Gaming and Careers Survey
 * Source: ASRS_E-Gaming_and_Careers_Survey.pdf
 *
 * Field types are chosen to match the form creation UI exactly:
 *   - Open-text answers  → field_type='text',   validation_rules={"ui_type":"textarea"}
 *   - Radio button lists → field_type='choice',  validation_rules={"ui_type":"radio"}
 *   - Dropdowns          → field_type='select'
 *   - Yes/No matrix      → field_type='yesno',  sub-questions stored as field_options
 *
 * Safe to call on every startup — INSERT OR IGNORE prevents duplicates and
 * UPDATE statements keep labels/rules in sync with the PDF.
 *
 * Usage (inside initializeDatabase() in db.js):
 *   import { seedEgamingSurvey } from '@/app/manage-surveys/mauricesurvey';
 *   seedEgamingSurvey(db);
 */
export function seedEgamingSurvey(db) {
  try {
    console.log('[db:egaming] Starting E-Gaming survey seed...');

    // ── Resolve initiative ───────────────────────────────────────────────────
    const egamingInit = db
      .prepare("SELECT initiative_id, initiative_name FROM initiative WHERE initiative_name = 'E-Gaming and Careers'")
      .get();

    if (!egamingInit) {
      console.warn('[db:egaming] Initiative "E-Gaming and Careers" not found — survey seed skipped.');
      return;
    }

    const egamingInitId = egamingInit.initiative_id;
    console.log('[db:egaming] Found initiative id =', egamingInitId);

    // ── 1. Fields ────────────────────────────────────────────────────────────
    // field_type is the DB-safe type; validation_rules.ui_type is the display hint
    // used by the form renderer (matches QUESTION_TYPE_DEFS in form-creation/page.js).
    //
    // PDF question mapping:
    //   Q1  school                — text (Short Text)       — locked required field in db.js
    //   Q2  egaming_grade         — select (Dropdown)        — 6th / 7th / 8th / Other
    //   Q3  egaming_career_interest — choice/radio           — Programming … Production
    //   Q4  liked_most            — text + ui_type:textarea  — Long Text
    //   Q5  liked_least           — text + ui_type:textarea  — Long Text
    //   Q6  new_learnings         — text + ui_type:textarea  — Long Text
    //   Q7  improvements          — text + ui_type:textarea  — Long Text
    //   Q8  egaming_yesno         — yesno matrix             — 5 sub-questions as field_options
    //   Q9  overall_rating        — choice/radio             — Poor / Fair / Good / Excellent
    //   Q10 future_activities     — text + ui_type:textarea  — Long Text

    // Reusable JSON strings
    const TEXTAREA_RULES = JSON.stringify({ ui_type: 'textarea' });
    const RADIO_RULES    = JSON.stringify({ ui_type: 'radio' });

    const fieldDefs = [
      // [key, label, db_type, scope, is_filterable, validation_rules_json]
      ['egaming_grade',
        'What grade are you in?',
        'select', 'initiative_specific', 1, null],

      ['egaming_career_interest',
        'Please select the E-Gaming and Career that interested you.',
        'multiselect', 'initiative_specific', 1, JSON.stringify({ ui_type: 'checkbox' })],

      ['liked_most',
        'What part of the E-Gaming and Career program did you like the most? Tell us why.',
        'text', 'initiative_specific', 0, TEXTAREA_RULES],

      ['liked_least',
        'What part of the E-Gaming and Career program did you like the least? Tell us why.',
        'text', 'initiative_specific', 0, TEXTAREA_RULES],

      ['new_learnings',
        'Tell us anything new that you learned during this program.',
        'text', 'initiative_specific', 0, TEXTAREA_RULES],

      ['improvements',
        'What would have made this class better?',
        'text', 'initiative_specific', 0, TEXTAREA_RULES],

      // Q8 — single yesno matrix; sub-questions seeded as field_options below
      ['egaming_yesno',
        'Please select Yes or No for the following questions.',
        'yesno', 'initiative_specific', 0, null],

      ['overall_rating',
        'Overall, how would you rate your experience in this program?',
        'choice', 'initiative_specific', 1, RADIO_RULES],

      ['future_activities',
        'What new activities would you like the program to offer in the future?',
        'text', 'initiative_specific', 0, TEXTAREA_RULES],
    ];

    const insertField = db.prepare(
      'INSERT OR IGNORE INTO field (field_key, field_label, field_type, scope, is_filterable, validation_rules) VALUES (?,?,?,?,?,?)'
    );
    // Keep label and validation_rules current on re-runs
    const updateField = db.prepare(
      'UPDATE field SET field_label = ?, validation_rules = ? WHERE field_key = ?'
    );

    for (const [key, label, type, scope, filterable, rules] of fieldDefs) {
      const r = insertField.run(key, label, type, scope, filterable, rules);
      if (r.changes > 0) {
        console.log('[db:egaming] Inserted field:', key);
      } else {
        updateField.run(label, rules, key);
      }
    }

    // ── 2. Field options ─────────────────────────────────────────────────────
    const getField  = db.prepare('SELECT field_id FROM field WHERE field_key = ?');
    const insertOpt = db.prepare(
      'INSERT OR IGNORE INTO field_options (field_id, option_value, display_label, display_order) VALUES (?,?,?,?)'
    );

    const optionSets = {
      // Q2 — exactly as shown in PDF
      egaming_grade: [
        ['6th',   '6th',   0],
        ['7th',   '7th',   1],
        ['8th',   '8th',   2],
        ['other', 'Other', 3],
      ],
      // Q3 — career tracks exactly as listed in PDF
      egaming_career_interest: [
        ['programming', 'Programming', 0],
        ['narrative',   'Narrative',   1],
        ['audio',       'Audio',       2],
        ['art',         'Art',         3],
        ['design',      'Design',      4],
        ['production',  'Production',  5],
      ],
      // Q8 — yes/no sub-questions stored as field_options (yesno type)
      egaming_yesno: [
        ['Did you feel actively involved in the program?',                   'Did you feel actively involved in the program?',                   0],
        ['Was the program interesting?',                                     'Was the program interesting?',                                     1],
        ['Were the topics important to you?',                                'Were the topics important to you?',                                2],
        ['Did the instructor do a good job of getting their points across?', 'Did the instructor do a good job of getting their points across?', 3],
        ['Were you able to ask questions and receive helpful responses?',    'Were you able to ask questions and receive helpful responses?',    4],
      ],
      // Q9 — exactly as shown in PDF
      overall_rating: [
        ['poor',      'Poor',      0],
        ['fair',      'Fair',      1],
        ['good',      'Good',      2],
        ['excellent', 'Excellent', 3],
      ],
    };

    for (const [fieldKey, opts] of Object.entries(optionSets)) {
      const fieldRow = getField.get(fieldKey);
      if (!fieldRow) {
        console.warn('[db:egaming] Field not found for options:', fieldKey);
        continue;
      }
      let inserted = 0;
      for (const [val, lbl, ord] of opts) {
        inserted += insertOpt.run(fieldRow.field_id, val, lbl, ord).changes;
      }
      console.log(`[db:egaming] Options for '${fieldKey}': ${inserted} new, ${opts.length - inserted} already existed`);
    }

    // ── 3. Form ──────────────────────────────────────────────────────────────
    const FORM_NAME = 'E-Gaming and Careers Survey';
    let egamingFormId;

    const existingForm = db
      .prepare('SELECT form_id FROM form WHERE initiative_id = ? AND form_name = ?')
      .get(egamingInitId, FORM_NAME);

    if (existingForm) {
      egamingFormId = existingForm.form_id;
      // Ensure published — GET route filters WHERE is_published = 1
      db.prepare('UPDATE form SET is_published = 1 WHERE form_id = ?').run(egamingFormId);
      console.log('[db:egaming] Form already exists, id =', egamingFormId, '(ensured published)');
    } else {
      const result = db
        .prepare('INSERT INTO form (initiative_id, form_name, description, is_published) VALUES (?,?,?,1)')
        .run(
          egamingInitId,
          FORM_NAME,
          'Feedback survey for the E-Gaming and Careers Program. Responses are anonymous.'
        );
      egamingFormId = result.lastInsertRowid;
      console.log('[db:egaming] Created form, id =', egamingFormId);
    }

    // ── 4. Remove old separate yesno form_field links ────────────────────────
    // Previous seed versions linked 5 individual yesno fields. Remove them so
    // the consolidated egaming_yesno field is the only Q8 representation.
    const oldYesNoKeys = [
      'actively_involved', 'program_interesting', 'topics_important',
      'instructor_effective', 'questions_helpful',
    ];
    for (const key of oldYesNoKeys) {
      const fieldRow = getField.get(key);
      if (fieldRow) {
        const r = db
          .prepare('DELETE FROM form_field WHERE form_id = ? AND field_id = ?')
          .run(egamingFormId, fieldRow.field_id);
        if (r.changes > 0) console.log('[db:egaming] Removed old form_field link:', key);
      }
    }

    // ── 5. Form fields ───────────────────────────────────────────────────────
    // 'school', 'full_name', 'email', and 'phone_number' are locked REQUIRED_FIELDS
    // hardcoded in the form creation UI — they are NOT seeded here to avoid duplicates.
    // help_text mirrors the parenthetical notes shown in the PDF for Q4, Q5, Q7.
    const WORKSHOPS_NOTE = 'You can comment on the content of the workshops, activities, and/or speakers';

    const formFieldOrder = [
      // [field_key,              required, help_text]
      ['egaming_grade',           1,        null],
      ['egaming_career_interest', 0,        null],
      ['liked_most',              0,        WORKSHOPS_NOTE],
      ['liked_least',             0,        WORKSHOPS_NOTE],
      ['new_learnings',           0,        null],
      ['improvements',            0,        WORKSHOPS_NOTE],
      ['egaming_yesno',           0,        null],
      ['overall_rating',          0,        null],
      ['future_activities',       0,        null],
    ];

    const insertFF = db.prepare(
      'INSERT OR IGNORE INTO form_field (form_id, field_id, display_order, required, help_text) VALUES (?,?,?,?,?)'
    );
    // Keep display_order, required, and help_text current on re-runs
    const updateFF = db.prepare(
      'UPDATE form_field SET display_order = ?, required = ?, help_text = ? WHERE form_id = ? AND field_id = ?'
    );

    let ffInserted = 0;
    for (let i = 0; i < formFieldOrder.length; i++) {
      const [key, required, helpText] = formFieldOrder[i];
      const fieldRow = getField.get(key);
      if (!fieldRow) {
        console.warn('[db:egaming] form_field skip — field not found:', key);
        continue;
      }
      const r = insertFF.run(egamingFormId, fieldRow.field_id, i, required, helpText);
      if (r.changes > 0) {
        ffInserted++;
      } else {
        updateFF.run(i, required, helpText, egamingFormId, fieldRow.field_id);
      }
    }

    console.log(`[db:egaming] form_field rows: ${ffInserted} inserted, ${formFieldOrder.length - ffInserted} updated`);
    console.log('[db:egaming] ✓ E-Gaming survey seed complete.');
  } catch (err) {
    console.error('[db:egaming] Seed error:', err.message);
    console.error('[db:egaming] Stack:', err.stack);
  }
}