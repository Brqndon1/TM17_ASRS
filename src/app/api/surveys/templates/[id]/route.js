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

import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data", "surveys.json");

/**
 * Read all survey templates from the JSON file
 * @returns {Promise<Array>} Array of survey template objects
 */
async function readSurveys() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}

/**
 * GET handler - Fetch a specific survey template by ID
 *
 * @param {Request} request - The incoming HTTP request
 * @param {Object} context - Next.js context containing route parameters
 * @param {Object} context.params - Route parameters
 * @param {string} context.params.id - The template ID to fetch
 */
export async function GET(request, context) {
  try {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Extract template ID from URL parameters
    // ─────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Load all templates and find the requested one
    // ─────────────────────────────────────────────────────────────────────
    const surveys = await readSurveys();
    const template = surveys.find(s => s.id === templateId);

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Return the template or 404 if not found
    // ─────────────────────────────────────────────────────────────────────
    if (!template) {
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

    // Template found - return it
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
