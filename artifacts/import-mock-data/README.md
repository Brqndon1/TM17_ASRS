Mock import pack for the admin Data Import screen.

Files are organized one table per file because the importer targets a single table at a time.

Suggested import order:
1. `initiative.csv` or `initiative.json`
2. `category.csv` or `category.json`
3. `field.csv` or `field.json`
4. `field_options.csv` or `field_options.json`
5. `submission.csv` or `submission.json`
6. `submission_value.csv` or `submission_value.json`
7. `initiative_budget.csv` or `initiative_budget.json`

Important constraint:
- The current importer auto-generates IDs for `initiative`, `field`, and `submission`.
- Because of that, the `field_options`, `submission`, `submission_value`, and `initiative_budget` mock files in this pack reference rows that already exist in the current database.
- In particular, `submission_value.*` targets existing submission IDs so it can be imported directly without first looking up newly generated IDs.

These files were created only for manual import testing. Nothing has been imported.
