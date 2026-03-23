Survey Submission — Implementation & Testing Report
===============================================

**Overview**

This document records everything we discussed and did in this session regarding survey submission handling and database writes. It contains the investigation findings, the code changes that were made, the exact SQL/commands to run for verification, and next steps.

Use this as a single reference for testing the website behavior, verifying database state, and understanding the instrumentation added.

**Quick summary**
- The site already accepted survey submissions via `POST /api/surveys` and stored the full responses JSON in the legacy `surveys.responses` column.
- I implemented two features you requested:
  - A duplicate-submission guard (exact-match on `email` + responses JSON) returning HTTP 409.
  - Best-effort, normalized writes into `submission` and `submission_value` when a published `form` (template) is detected and the UI sends `templateAnswers` keyed by `field_id`.
- The legacy `surveys` + `reports` insertion remains atomic and unchanged in its guarantees; the normalized writes run after that as a best-effort step and will not abort the main insert if they fail.

**Files inspected (key references)**
- Survey submission handler (updated): [src/app/api/surveys/route.js](src/app/api/surveys/route.js#L1-L200)
- Survey page (client UI that posts payload): [src/app/survey/page.js](src/app/survey/page.js#L1-L800)
- Database schema and table definitions: [src/lib/db.js](src/lib/db.js#L240-L520)
- Payload validation + sanitization: [src/lib/survey-validation.js](src/lib/survey-validation.js#L1-L240)
- AI report generation used by endpoint (best-effort): [src/lib/openai.js](src/lib/openai.js#L1-L120)

**What I found before changing code**
- `POST /api/surveys` existed and inserted the entire cleaned `responses` object as JSON into `surveys.responses` (see the API route). The UI posts to `/api/surveys` when the user submits.
- The database schema already included normalized tables: `submission` and `submission_value` with typed columns (`value_text`, `value_number`, `value_date`, `value_bool`, `value_json`) — but there were no `INSERT` statements anywhere in the codebase that wrote to those tables.
- There was no duplicate-submission guard in the existing flow, so identical payloads could be submitted multiple times.

**What I changed (implementation details)**

- File changed: [src/app/api/surveys/route.js](src/app/api/surveys/route.js#L1-L200)

- Main additions:
  1. Duplicate-submission guard (exact match on `email` + `responses` JSON):

     - SQL used:

       ```sql
       SELECT id FROM surveys WHERE email = ? AND responses = ? LIMIT 1
       ```

     - If found, the handler returns HTTP 409 and JSON: `{ error: 'Duplicate submission detected' }`.

  2. Best-effort normalized insertion into `submission` and `submission_value` when a template/form mapping exists:

     - The handler looks for an effective template id at `cleaned.templateId` or `cleaned.responses.templateId`.
     - If present, it tries to resolve `form.form_id` via:

       ```sql
       SELECT form_id, initiative_id FROM form WHERE form_id = ? LIMIT 1
       ```

     - If a `form` row exists, the handler runs a transaction that:
       - Inserts a `submission` row via:

         ```sql
         INSERT INTO submission (initiative_id, form_id, submitted_by_user_id) VALUES (?, ?, NULL)
         ```

         and captures `submissionId` using `lastInsertRowid`.

       - For each `field_id` → `answer` in `cleaned.responses.templateAnswers` (the UI sends `templateAnswers` when the submission is template-based), it inserts a `submission_value` row via a prepared statement:

         ```sql
         INSERT INTO submission_value (submission_id, field_id, value_text, value_number, value_date, value_bool, value_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ```

       - Value mapping rules used by the insertion code:
         - numeric → `value_number`
         - boolean → `value_bool` (stored as 0/1)
         - object → `value_json` (JSON string)
         - ISO-like date strings → `value_date`
         - otherwise → `value_text` (truncated to 1000 chars)

     - Per-value errors (bad field id, unique constraints, etc.) are caught and ignored so one bad value won't stop the rest.

  3. Non-fatal behavior & logging

     - Normalized inserts are attempted only after the main `surveys` + `reports` transaction commits. Any error in the normalized path is logged and reported via `alertDb(...)`, but does not roll back the main insert.

**Why this approach**
- It keeps the existing API and reporting behavior stable and preserves atomicity for the core survey + report flow.
- It wires the new normalized tables incrementally: normalized data is written when the system can reliably map the submission to a published `form` and the UI supplies `templateAnswers` keyed by `field_id`.

**How to test this using the actual website (step-by-step)**

1. Start the dev server from the repository root (run these in PowerShell):

```powershell
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

2. Find a published form id (optional but required to exercise normalized inserts):

```powershell
sqlite3 .\data\asrs.db "SELECT form_id, form_name FROM form WHERE is_published = 1;"
```

3. Open the survey page in your browser:
  - For template-based test: visit `http://localhost:3000/survey?template=FORM_ID` (replace `FORM_ID` with a numeric `form_id` from step 2).
  - For default survey (non-template): visit `http://localhost:3000/survey`.

4. Fill the form and click **Submit Survey**.

5. Expect the success screen: "Thank You! Your survey response has been submitted successfully.".

6. Verify the legacy `surveys` row (always written):

```powershell
sqlite3 .\data\asrs.db "SELECT id, name, email, submitted_at, responses FROM surveys ORDER BY submitted_at DESC LIMIT 1;"
```

Inspect the `responses` JSON to confirm it contains `templateAnswers` (if you used a template) and `templateId`.

7. Verify normalized `submission` rows (only created for template-based submissions where a `form` exists):

```powershell
sqlite3 .\data\asrs.db "SELECT submission_id, initiative_id, form_id, submitted_at FROM submission ORDER BY submitted_at DESC LIMIT 5;"

sqlite3 .\data\asrs.db "SELECT submission_value_id, submission_id, field_id, value_text, value_number, value_date, value_bool, value_json FROM submission_value WHERE submission_id = <SUBMISSION_ID> ORDER BY submission_value_id;"
```

Replace `<SUBMISSION_ID>` with the id observed in the previous query.

8. Map `field_id` to human-friendly labels (if needed):

```powershell
sqlite3 .\data\asrs.db "SELECT ff.field_id, f.field_label FROM form_field ff JOIN field f ON ff.field_id = f.field_id WHERE ff.form_id = FORM_ID ORDER BY ff.display_order;"
```

9. Test duplicate-guard:
  - Submit the *exact same payload* again (same email and identical answers JSON). The second attempt should return HTTP 409 and the UI should show the duplicate error (server returns `{ error: 'Duplicate submission detected' }`).
  - You can also check the `surveys` table count for that email to verify no duplicate insertion occurred.

```powershell
sqlite3 .\data\asrs.db "SELECT id, email, submitted_at FROM surveys WHERE email = 'the.email@example.com' ORDER BY submitted_at DESC LIMIT 10;"
```

**QR code / conversion checks (queries used earlier in this session)**

- To list recent converted QR scans (converted_to_submission = 1):

```powershell
sqlite3 .\data\asrs.db "SELECT s.scan_id, q.qr_code_key, q.target_url, s.ip_address, s.user_agent, s.referrer, s.converted_to_submission, s.scanned_at FROM qr_scans s JOIN qr_codes q ON s.qr_code_id = q.qr_code_id WHERE s.converted_to_submission = 1 ORDER BY s.scanned_at DESC LIMIT 50;"
```

- Example output observed earlier in this session (from your database):

```
8|qr_5852555f576d|1|2026-03-23 02:51:54
5|qr_0524b3884ae9|1|2026-03-13 19:19:10
4|qr_0524b3884ae9|1|2026-03-13 18:55:29
```

These rows show scan IDs and corresponding `qr_code_key`s that have `converted_to_submission = 1`, which indicates QR scans that were marked as converting into survey submissions.

**Exact code/SQL that was added or used**

- Duplicate check (JS snippet in the handler):

```js
const responsesJSON = JSON.stringify(cleaned.responses);
const existing = db.prepare(`SELECT id FROM surveys WHERE email = ? AND responses = ? LIMIT 1`).get(cleaned.email, responsesJSON);
if (existing) {
  return NextResponse.json({ error: 'Duplicate submission detected' }, { status: 409 });
}
```

- Survey + report insert (kept atomic):

```js
const insertSurveyAndReport = db.transaction((name, email, responsesJSONInner, reportJSON, templateId) => {
  const surveyInfo = db.prepare(`INSERT INTO surveys (name, email, responses) VALUES (?, ?, ?)`).run(name, email, responsesJSONInner);
  const surveyId = surveyInfo.lastInsertRowid;

  db.prepare(`INSERT INTO reports (survey_id, report_data) VALUES (?, ?)`).run(surveyId, reportJSON);
  // update response_count in survey_distribution when applicable
  return surveyId;
});
```

- Normalized insert (transaction) — simplified excerpt:

```js
const insertNormalized = db.transaction((formId, initiativeId, answers) => {
  const submissionInfo = db.prepare(`INSERT INTO submission (initiative_id, form_id, submitted_by_user_id) VALUES (?, ?, NULL)`).run(initiativeId || 1, formId);
  const submissionId = submissionInfo.lastInsertRowid;
  const insertVal = db.prepare(`INSERT INTO submission_value (submission_id, field_id, value_text, value_number, value_date, value_bool, value_json) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const [fieldKey, rawVal] of Object.entries(answers || {})) { /* map types and run insertVal.run(...) */ }
});
```

**Commands / queries used in this session**

- Start dev server:

```powershell
npm install
npm run dev
```

- Inspect DB tables and recent rows (examples):

```powershell
sqlite3 .\data\asrs.db "SELECT id, name, email, submitted_at FROM surveys ORDER BY submitted_at DESC LIMIT 10;"
sqlite3 .\data\asrs.db "SELECT submission_id, initiative_id, form_id, submitted_at FROM submission ORDER BY submitted_at DESC LIMIT 10;"
sqlite3 .\data\asrs.db "SELECT * FROM qr_scans ORDER BY scanned_at DESC LIMIT 20;"
```

**Todo list (what we tracked & statuses)**

- Search for survey endpoints — completed
- Inspect DB update handlers — completed
- Confirm and report status — completed
- Start dev server locally — not done in this session (instructions provided)
- Open survey page and submit via UI — not done in this session (instructions provided)
- Verify DB row in data/asrs.db — not done interactively by me (instructions provided)
- Optional: verify reports + distribution counter — not done interactively (instructions provided)
- Implement normalized submission writes — completed
- Add duplicate-submission check — completed
- Provide website test instructions — completed

**Git / diff**

The only file changed in this session is the surveys API route: [src/app/api/surveys/route.js](src/app/api/surveys/route.js#L1-L200). Below is the diff produced during the session (keeps the context of edits):

```diff
diff --git a/src/app/api/surveys/route.js b/src/app/api/surveys/route.js
index 4427202..d337d4a 100644
--- a/src/app/api/surveys/route.js
+++ b/src/app/api/surveys/route.js
@@ -20,23 +20,23 @@ export async function POST(request) {
     const body = await request.json();
     const cleaned = validateAndCleanSurvey(body);
 
-    // Generate basic statistics on cleaned responses
+    // Basic stats and AI report (best-effort)
     const basicStats = generateBasicStats(cleaned.responses);
@@
-    // Use a transaction so survey + report are atomic
-    const insertSurveyAndReport = db.transaction((name, email, responsesJSON, reportJSON, templateId) => {
-      const surveyInfo = db.prepare(
-        `INSERT INTO surveys (name, email, responses) VALUES (?, ?, ?)`
-      ).run(name, email, responsesJSON);
+    // Duplicate submission guard: exact same email + responses JSON
+    const responsesJSON = JSON.stringify(cleaned.responses);
+    const existing = db.prepare(`SELECT id FROM surveys WHERE email = ? AND responses = ? LIMIT 1`).get(cleaned.email, responsesJSON);
+    if (existing) {
+      return NextResponse.json({ error: 'Duplicate submission detected' }, { status: 409 });
+    }
@@
+    // Attempt to populate normalized submission tables when a form mapping exists.
+    // This is best-effort and should not abort the main survey submission.
@@
     return NextResponse.json({ success: true, surveyId: Number(surveyId), report: reportData });
```

**Notes, caveats, and next-step recommendations**

- The normalized insert assumes `templateAnswers` keys are numeric `field_id` values (this is what the UI uses for published templates). If you plan to change how the UI posts answers (e.g., by using custom keys or strings), we must adapt the mapping code to resolve field ids by key rather than expecting numeric keys.
- The duplicate-guard is an exact-match rule (email + exact JSON). If you want a different rule (per-template only, or dedupe within a time window, or fuzzy matching), tell me which policy you prefer and I will update the code accordingly.
- You may want to add indices/constraints for performance and data integrity (e.g., unique constraint for `submission` if appropriate, or index on `submission.submitted_at`), depending on expected volume.
- If desired, we can change normalized inserts to run in the same transaction as the `surveys` insert so everything is fully atomic. I kept them best-effort to avoid risking core survey submission due to mapping or schema drift errors.

**If you want me to do more now**
- I can run an end-to-end submission using the website from this environment and paste the actual `sqlite3` outputs. (I did not run a full UI submit in this session.)
- I can tighten the duplicate-guard to be per-template or to apply a time-window instead of exact JSON equality.
- I can add a small integration test that posts a sample template payload to the `POST /api/surveys` route and verifies both `surveys` and `submission`/`submission_value` rows were created.

-----
Generated during this session. If you'd like this saved as `README.md` instead, or placed under a docs folder, tell me where to move it and I'll update the repo.
