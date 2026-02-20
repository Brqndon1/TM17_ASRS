import db from '../../../../lib/db.js';

export async function GET() {
  // Query all forms (survey templates)
  const forms = db.prepare(`
    SELECT form_id AS id, form_name AS title, description, created_at, is_published AS published
    FROM form
    WHERE is_published = 1
  `).all();

  // For each form, get questions
  const getQuestions = db.prepare(`
    SELECT ff.form_field_id, f.field_id, f.field_label, f.field_type, ff.required, ff.help_text
    FROM form_field ff
    JOIN field f ON ff.field_id = f.field_id
    WHERE ff.form_id = ?
    ORDER BY ff.display_order
  `);
  const getOptions = db.prepare(`
    SELECT option_value, display_label FROM field_options WHERE field_id = ? ORDER BY display_order`);

  const surveys = forms.map(form => {
    const questions = getQuestions.all(form.id).map(q => {
      const options = (q.field_type === 'select' || q.field_type === 'multiselect' || q.field_type === 'choice')
        ? getOptions.all(q.field_id).map(opt => opt.option_value)
        : undefined;
      return {
        id: q.field_id,
        text: {
          question: q.field_label,
          type: q.field_type,
          required: !!q.required,
          ...(options ? { options } : {}),
          ...(q.help_text ? { help_text: q.help_text } : {})
        }
      };
    });
    return {
      id: form.id,
      title: form.title,
      description: form.description,
      questions,
      createdAt: form.created_at,
      published: !!form.published
    };
  });
  return new Response(JSON.stringify(surveys), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, questions } = body || {};
    if (!title || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Insert new form (survey template)
    const now = new Date().toISOString();
    const insertForm = db.prepare(`
      INSERT INTO form (initiative_id, form_name, description, created_at, updated_at, updated_by_user_id, is_published)
      VALUES (?, ?, ?, ?, ?, NULL, 1)
    `);
    const result = insertForm.run(1, title, description || '', now, now);
    const formId = result.lastInsertRowid;

    // Insert questions
    const insertField = db.prepare(`
      INSERT INTO field (field_key, field_label, field_type, scope, is_filterable, is_required_default)
      VALUES (?, ?, ?, 'common', 0, 0)
    `);
    const insertFormField = db.prepare(`
      INSERT INTO form_field (form_id, field_id, display_order, required, is_hidden, help_text)
      VALUES (?, ?, ?, ?, 0, ?)
    `);
    const insertOption = db.prepare(`
      INSERT INTO field_options (field_id, option_value, display_label, display_order)
      VALUES (?, ?, ?, ?)
    `);

    let displayOrder = 0;
    const questionObjs = [];
    for (const q of questions) {
      const textObj = typeof q === 'object' && q.text ? q.text : q;
      const fieldKey = `${title}_${displayOrder}_${Date.now()}`;
      const fieldLabel = textObj.question || '';
      const fieldType = textObj.type || 'text';
      const required = textObj.required ? 1 : 0;
      const helpText = textObj.help_text || null;
      // Insert field
      const fieldResult = insertField.run(fieldKey, fieldLabel, fieldType);
      const fieldId = fieldResult.lastInsertRowid;
      // Insert form_field
      insertFormField.run(formId, fieldId, displayOrder, required, helpText);
      // Insert options if present
      if (textObj.options && Array.isArray(textObj.options)) {
        textObj.options.forEach((opt, idx) => {
          insertOption.run(fieldId, opt, opt, idx);
        });
      }
      questionObjs.push({
        id: fieldId,
        text: {
          question: fieldLabel,
          type: fieldType,
          required: !!required,
          ...(textObj.options ? { options: textObj.options } : {}),
          ...(helpText ? { help_text: helpText } : {})
        }
      });
      displayOrder++;
    }

    const newSurvey = {
      id: formId,
      title,
      description: description || '',
      questions: questionObjs,
      createdAt: now,
      published: true
    };
    return new Response(JSON.stringify(newSurvey), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}