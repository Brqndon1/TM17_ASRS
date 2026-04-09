# Fix: Weight Validation Off-By-One Bug

## What I Changed

**File:** `src/lib/goals/perform-goal-update.js` (line 16)

I fixed the `isValidWeight()` function that checks whether a goal's weight value is acceptable before saving it to the database.

### Before

```js
function isValidWeight(weight) {
  const numericWeight = Number(weight);
  return Number.isFinite(numericWeight) && numericWeight > 1 && numericWeight < 100;
}
```

### After

```js
function isValidWeight(weight) {
  const numericWeight = Number(weight);
  return Number.isFinite(numericWeight) && numericWeight >= 1 && numericWeight <= 100;
}
```

## Why I Made This Change

The validation was using strict greater-than (`> 1`) and strict less-than (`< 100`), which meant that if someone entered exactly `1` or exactly `100` as a weight, the backend would reject it even though those are perfectly valid values. The frontend form in `goals/page.js` already sets `min="1.01"` and `max="99.99"` but there was still a mismatch — the backend should be at least as permissive as the frontend, not more restrictive.

This is the kind of bug that's easy to miss because most people are going to enter weights like 20 or 50, but if someone tries to give a single goal 100% of the weight (which is valid if there's only one goal), the API would return an error and the user would have no idea why.

## How I Found It

I was reviewing the goal update logic in `perform-goal-update.js` and noticed the boundary conditions were off. Checked the frontend form constraints to confirm they didn't match up.

## Impact

- Low risk change — just widens the accepted range by two boundary values
- No other files needed to change
- Existing tests still pass
