# Fix: Budget Allocation Form Blocked Zero-Dollar Categories

## What I Changed

**File:** `src/app/admin/budgets/page.js`

The budget allocation form that Gabriel built had a validation issue in the `validateBudgetForm()` function. It was checking if any budget category (personnel, equipment, operations, travel) was `<= 0` and rejecting the form if so. The problem is that this made it impossible to create a budget where one of the categories was legitimately $0. For example if an initiative has no travel costs, you should be able to enter $0 for travel, but the form would block you with "must all be positive numbers."

On top of that, just changing `<= 0` to `< 0` would have introduced a new bug. Since the form values are strings, `Number('')` evaluates to `0` in JavaScript, which means leaving a field completely blank would silently pass as a $0 allocation instead of being caught as an error.

## What I Did

I replaced the single validation check with three separate checks in the right order:

1. **Empty string check** — looks at the raw form string values (`form.personnel`, etc.) to catch blank fields before they get converted to numbers
2. **NaN check** — catches non-numeric input like letters or special characters (this was already there, just reordered)
3. **Negative check using `< 0`** — allows zero but blocks negative values, and updated the error message to say "cannot be negative" instead of "must all be positive"

The server-side API route (`/api/admin/budgets`) already allowed zero values so no backend changes were needed.

## Impact

- Admins can now create budgets where one or more categories are $0 (like an initiative with no travel or no equipment costs)
- Blank fields are properly caught and rejected instead of silently treated as $0
- Negative values are still blocked
- No changes to the budget table display or any other part of the page
