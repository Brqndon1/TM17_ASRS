# Batch Import Review Design

## Goal

Allow admins to drag multiple import files into `/admin/import`, review them together, and execute them in dependency order from a single confirmation step.

## Scope

This design covers the existing Data Import page and reuses the current `/api/admin/import` preview/execute endpoints. It does not change the database schema or add a new batch API.

## Workflow

1. The upload step accepts multiple `.csv` and `.json` files.
2. The client infers the target table from each filename using the existing importer table names.
3. The client previews each staged file against the current server preview endpoint.
4. The preview step becomes a review screen that shows all staged files, per-file row counts, inferred tables, preview status, and validation blockers.
5. The admin confirms once.
6. The client executes imports sequentially in dependency order:
   - `initiative`
   - `category`
   - `field`
   - `field_options`
   - `submission`
   - `submission_value`
   - `initiative_budget`
7. The result step shows per-file outcomes and aggregate totals.

## Constraints

- The current importer still imports one table at a time on the server.
- IDs for `initiative`, `field`, and `submission` are still auto-generated server-side.
- This change enables batch staging/review/execution, but does not introduce automatic ID remapping across dependent files.
- Existing single-file behavior remains supported.

## UX Notes

- Unknown filenames are surfaced in review instead of silently ignored.
- Invalid files block batch execution but remain visible with their error state.
- Per-file summaries remain inspectable without opening a separate screen for each file.

## Testing

- Add unit tests for batch helper logic:
  - file type detection
  - filename-to-table inference
  - dependency-order sorting
  - aggregate result calculation
- Run targeted Vitest coverage for the new helper and import route-adjacent behavior.
