# Survey Draft Preserve Fix (Simple Explanation)

## What was wrong
When someone was creating a survey template and switched pages/tabs, the unsaved work was lost.

This happened because the form only kept data in React state, which resets when the page unmounts.

## What we changed
We added local draft saving in `SurveyForm` using `localStorage`.

Now the form:
1. Tries to load a saved draft when it opens.
2. Auto-saves title, description, and questions while editing.
3. Clears the saved draft after successful submit.

## Why this is better
- Prevents accidental loss of work.
- Makes switching between merged Create/Survey flows safer.
- Low-risk change with immediate UX improvement.

## Small technical note
Auto-save is debounced (short delay) so it does not write to storage on every single keystroke.
