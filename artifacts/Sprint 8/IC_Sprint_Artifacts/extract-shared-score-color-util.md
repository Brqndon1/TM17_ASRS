# Refactor: Extract Shared getScoreColor Utility

## What I Changed

**New file:** `src/lib/score-utils.js`
**Modified:** `src/app/goals/page.js`, `src/app/performance/goals/page.js`

I pulled out the `getScoreColor()` function that was copy-pasted in multiple files and moved it into a single shared utility module. Then I updated the two goal pages to import from that shared file instead of defining their own copies.

### The shared util (`src/lib/score-utils.js`)

```js
export function getScoreColor(score) {
  if (score >= 80) return '#27AE60';
  if (score >= 50) return '#F39C12';
  return '#C0392B';
}
```

### What changed in each file

**`src/app/goals/page.js`**
- Added `import { getScoreColor } from '@/lib/score-utils';`
- Removed the local `getScoreColor` function definition (lines 224-228)

**`src/app/performance/goals/page.js`**
- Added `import { getScoreColor } from '@/lib/score-utils';`
- Removed the local `getScoreColor` function definition (lines 202-206)

## Why I Made This Change

The exact same function was defined in 3 different places across the codebase (`goals/page.js`, `performance/goals/page.js`, and `performance/budget/page.js` had a similar version in `getStatus`). This is a problem because if we ever want to change the color thresholds (like if Maurice asks us to change the cutoff from 80 to 75), we'd have to remember to update it in every single file. That's how bugs happen — you update one and forget the other two.

By extracting it into `src/lib/score-utils.js`, there's now one source of truth. Any page that needs score-based coloring just imports it. Way cleaner and less error-prone.

## How I Found It

While reviewing Alex's goal scoring work and the performance dashboard, I noticed the same function showing up in multiple places with identical logic. Classic case of DRY (Don't Repeat Yourself) violation that's easy to fix.

## Impact

- No behavior change at all — the function logic is identical
- Build passes, all existing tests pass
- Future changes to color thresholds only need to happen in one place
- Two files got slightly smaller, one new tiny file was created
