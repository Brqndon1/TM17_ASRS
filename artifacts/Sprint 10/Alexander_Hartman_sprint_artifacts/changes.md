What was done
Created src/app/manage-surveys/mauricesurvey.js to seed the E-Gaming and Careers survey into the database on initialization. Integrated it into db.js via a single seedEgamingSurvey(db) call.
Fields seeded
Defined 9 fields with types matching the form creation UI exactly, based on the source PDF (ASRS_E-Gaming_and_Careers_Survey.pdf):
Field keyLabelTypeegaming_gradeWhat grade are you in?selectegaming_career_interestPlease select the E-Gaming and Career that interested you.multiselect / checkboxliked_mostWhat part of the program did you like the most? Tell us why.text / textarealiked_leastWhat part of the program did you like the least? Tell us why.text / textareanew_learningsTell us anything new that you learned during this program.text / textareaimprovementsWhat would have made this class better?text / textareaegaming_yesnoPlease select Yes or No for the following questions.yesno matrixoverall_ratingOverall, how would you rate your experience in this program?choice / radiofuture_activitiesWhat new activities would you like the program to offer in the future?text / textarea
Field options seeded for egaming_grade (6th, 7th, 8th, Other), egaming_career_interest (Programming, Narrative, Audio, Art, Design, Production), egaming_yesno (5 sub-questions), and overall_rating (Poor, Fair, Good, Excellent).
Help text added to questions 4, 5, and 7 matching the parenthetical note in the PDF: "You can comment on the content of the workshops, activities, and/or speakers."
Seed strategy

Fields and options — created once on first run, guarded by checking if egaming_grade exists in the field table.
form_field rows — wiped and reseeded on every startup to prevent reportData.json fields from polluting the survey form.


Issues encountered and resolved
Survey not appearing in templates list
The existing db.js seed creates the form with is_published = 0 by default. The templates API filters WHERE is_published = 1, so the survey was invisible. Fixed by updating is_published = 1 when the form is found.
Duplicate field options on each restart
field_options has no unique constraint, making INSERT OR IGNORE ineffective — options doubled on every server restart. Fixed by switching to DELETE before INSERT for option rows.
Extra questions from reportData.json
db.js seeds form_field rows from reportData.json for every initiative, injecting unrelated fields (Career Awareness, Interest Level, Participation Count, Session Rating, Completion Status) into the E-Gaming form. Fixed by deleting all form_field rows for the form and re-inserting only the 10 PDF questions on every startup.
School field not displaying
school was removed from formFieldOrder under the incorrect assumption it was covered by the frontend REQUIRED_FIELDS constant in form-creation/page.js. Those fields are only injected when building a new form through the UI — the survey taking page reads purely from form_field in the DB. Fixed by adding school back to formFieldOrder.