# Performance Goals Page — Changes

## File
`src/app/performance/goals/page.js`

---

## Summary
Updated the initiative performance dashboard to use a proper weighted scoring formula,
with an expandable per-goal breakdown panel and weight validation.

---

## Changes

### 1. Weighted Score Formula
Added a `calcWeightedScore(goals)` helper that mirrors the server's `computeOverallScore` logic.

**Formula:**
```
Performance % = Σ ( goal.score × (goal.weight / Σ all weights) )
```

- Weights are **normalized against their sum**, so raw values like `2` and `1` display as `66.7%` and `33.3%` respectively.
- `goal.score` is used directly from the server response (already handles `linear`, `threshold`, and `binary` scoring methods).
- `overallScore` for the table still comes from `goalsData.overallScore` (the server), so it stays consistent with the chart.
- `calcWeightedScore` is used only for the breakdown panel's per-goal contribution display.

### 2. Correct API Field Names
Updated field references to match what `/api/goals` actually returns:

| Old (incorrect) | New (correct) |
|---|---|
| `g.current` | `g.current_value` |
| `g.target` | `g.target_value` |
| `g.name` | `g.goal_name` |

### 3. Expandable Goal Breakdown Panel
- Clicking any initiative row now expands an inline `WeightBreakdownPanel` below it.
- Shows per-goal: name, current value, target value, normalized weight %, progress bar, and weighted contribution.
- A totals footer shows the sum of weights (always 100% after normalization) and the total contribution score.
- A `⚠️` banner is shown if all weights are zero (scoring is impossible).

### 4. New State
- `expandedId` — tracks which initiative row is currently expanded.
- `handleRowClick(initiative)` — sets both `selectedInitiativeId` (for the chart) and toggles `expandedId`.

### 5. Weight Error Handling
- Weight errors now only trigger when `totalWeightRaw === 0` (all goals have zero weight).
- Removed the previous requirement that weights must sum to exactly `1.0`, which was incorrectly blocking scores for any initiative using raw weights (e.g. `1`, `2`, `3`).
- The progress bar turns amber and the score cell shows a `⚠️ Weight Error` badge when weights are invalid.

### 6. Summary Stats
Added a **Weight Errors** stat card to the summary grid, showing the count of initiatives with invalid weights (highlighted red if > 0, green if 0).

### 7. Key Prop Fix
Replaced `<>` fragment (which cannot hold a `key`) with `<tbody key={initiative.initiative_id}>` per map iteration.
Multiple `<tbody>` elements per table is valid HTML and resolves the React key warning without requiring `React.Fragment`.