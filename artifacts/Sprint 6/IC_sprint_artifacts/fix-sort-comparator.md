# Fix: Missing Return Value in Performance Dashboard Sort

## What Was Wrong

The Performance Scoring Dashboard (`src/app/performance-dashboard/page.js`) has a function called `getSortedInitiatives()` that lets users sort the initiative table by score (ascending/descending) or by nearest deadline. The sort comparator had a subtle bug in its control flow:

```js
if (sortOrder === 'ascending') {
  return a.overallScore - b.overallScore;
} else if (sortOrder === 'descending') {
  return b.overallScore - a.overallScore;
} else if (sortOrder === 'deadline') {
  // deadline sort logic...
  return aDays - bDays;
}
// <-- if none of the above match, returns undefined
```

The issue is that all three branches use `if / else if / else if`. If `sortOrder` ever held a value that wasn't one of those three strings (for example during a weird state update or if someone added a new sort option and forgot to handle it here), the function would return `undefined` instead of a number. According to the JavaScript spec, when a sort comparator returns `undefined`, the behavior is implementation-dependent — meaning different browsers could sort the list differently or not sort it at all.

In practice this probably never triggered since `sortOrder` is only set to those three values through `toggleSortOrder()`, but it's still a correctness issue that could cause hard-to-debug problems down the line.

## What Was Changed

Changed the last `else if (sortOrder === 'deadline')` to just `else`. This makes the deadline sort the default fallback, so the comparator always returns a number no matter what:

```js
if (sortOrder === 'ascending') {
  return a.overallScore - b.overallScore;
} else if (sortOrder === 'descending') {
  return b.overallScore - a.overallScore;
} else {
  // 'deadline' — soonest first, nulls last
  const aDays = a.daysUntilNearest !== null ? a.daysUntilNearest : Infinity;
  const bDays = b.daysUntilNearest !== null ? b.daysUntilNearest : Infinity;
  return aDays - bDays;
}
```

## Why This Matters

Sort comparators in JavaScript are expected to always return a number (negative, zero, or positive). Returning `undefined` is technically undefined behavior. Even though this was unlikely to be hit with the current three sort options, making the branches exhaustive is a basic defensive coding practice. If anyone adds a fourth sort mode later and forgets to update this function, it'll at least fall back to deadline sorting instead of doing something unpredictable.

## File Changed

- `src/app/performance-dashboard/page.js` (lines ~182-195, inside `getSortedInitiatives`)
