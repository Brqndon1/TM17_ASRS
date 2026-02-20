/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API ENDPOINT: GET /api/surveys/templates/[id]
 * ═══════════════════════════════════════════════════════════════════════════
 * Purpose: Fetch a specific survey template by its ID
 *
 * This endpoint is used when a user scans a template-linked QR code.
 * The survey page loads the template to display custom questions instead
 * of the default hardcoded survey form.
 *
 * URL Format: /api/surveys/templates/123456789
 * Method: GET
 *
 * Response:
 * {
 *   "id": "123456789",
 *   "title": "Student Experience Survey",
 *   "description": "Tell us about your experience",
 *   "questions": [
 *     { "id": 1, "text": "How satisfied are you?" },
 *     { "id": 2, "text": "What can we improve?" }
 *   ],
 *   "createdAt": "2024-01-15T10:30:00.000Z",
 *   "published": true
 * }
 *
 * Error Responses:
 * - 404: Template not found
 * - 500: Server error
 * ═══════════════════════════════════════════════════════════════════════════
 */

import db from '../../../../lib/db.js';

/**
 * GET handler - Fetch a specific survey template by ID
 *
 * @param {Request} request - The incoming HTTP request
 * @param {Object} context - Next.js context containing route parameters
 * @param {Object} context.params - Route parameters
 * @param {string} context.params.id - The template ID to fetch
 */
  try {
    // Access params using context.params (Next.js 15+ requirement)
    const params = await context.params;
    const templateId = params.id;

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: "Template ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Query form by form_id
    const form = db.prepare(`
      SELECT form_id AS id, form_name AS title, description, created_at, is_published AS published
      FROM form
      WHERE form_id = ?
    `).get(templateId);

    if (!form) {
      return new Response(
        JSON.stringify({
          error: "Template not found",
          message: `No survey template exists with ID: ${templateId}`
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get questions
    const getQuestions = db.prepare(`
      SELECT ff.form_field_id, f.field_id, f.field_label, f.field_type, ff.required, ff.help_text
      FROM form_field ff
      JOIN field f ON ff.field_id = f.field_id
      WHERE ff.form_id = ?
      ORDER BY ff.display_order
    `);
    const getOptions = db.prepare(`
      SELECT option_value, display_label FROM field_options WHERE field_id = ? ORDER BY display_order`);

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

    const template = {
      id: form.id,
      title: form.title,
      description: form.description,
      questions,
      createdAt: form.created_at,
      published: !!form.published
    };

    return new Response(
      JSON.stringify(template),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error('Error fetching survey template:', err);
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: err.message || String(err)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
