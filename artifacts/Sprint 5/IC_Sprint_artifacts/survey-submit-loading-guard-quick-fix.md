# Quick Fix: Prevent Double Survey Submission

## What I changed
I improved the survey submit flow so users cannot accidentally submit the same response multiple times by clicking fast.

Updated file:
- `src/app/survey/page.js`

## Changes made
1. Added a hard guard in `handleSubmit`:
- If `isSubmitting` is already true, the function returns immediately.

2. Added `aria-busy={isSubmitting}` on the form:
- Helps indicate loading state for accessibility tools.

3. Wrapped survey input sections in a disabled `<fieldset>` while submitting:
- Users cannot change inputs during an active submission request.

## Why this helps
The button already showed "Submitting..." and was disabled, but adding the function-level guard and disabled fieldset makes the behavior safer and more consistent during fast user actions or repeated enter key presses.

## Verification
Ran lint on the updated file:
- `npx eslint src/app/survey/page.js`
- Result: passed
