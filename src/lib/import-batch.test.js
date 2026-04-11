import {
  DEFAULT_IMPORT_ORDER,
  getImportFileType,
  inferImportTable,
  sortBatchFilesForExecution,
  summarizeBatchResults,
} from '@/lib/import-batch';

describe('import-batch helpers', () => {
  test('detects supported import file types from file names', () => {
    expect(getImportFileType('initiative.csv')).toBe('csv');
    expect(getImportFileType('submission_value.JSON')).toBe('json');
    expect(getImportFileType('notes.txt')).toBe(null);
    expect(getImportFileType('no-extension')).toBe(null);
  });

  test('infers importer tables from file names', () => {
    const allowedTables = ['initiative', 'category', 'field_options', 'submission_value'];

    expect(inferImportTable('initiative.csv', allowedTables)).toBe('initiative');
    expect(inferImportTable('field_options.json', allowedTables)).toBe('field_options');
    expect(inferImportTable('FIELD_OPTIONS.JSON', allowedTables)).toBe('field_options');
    expect(inferImportTable('unknown-file.csv', allowedTables)).toBe(null);
  });

  test('sorts batch files in dependency order while preserving relative order within a table', () => {
    const batch = [
      { fileName: 'submission_value.json', inferredTable: 'submission_value' },
      { fileName: 'category.json', inferredTable: 'category' },
      { fileName: 'initiative-b.csv', inferredTable: 'initiative' },
      { fileName: 'submission.csv', inferredTable: 'submission' },
      { fileName: 'initiative-a.csv', inferredTable: 'initiative' },
      { fileName: 'unknown.csv', inferredTable: null },
      { fileName: 'field.csv', inferredTable: 'field' },
    ];

    expect(sortBatchFilesForExecution(batch, DEFAULT_IMPORT_ORDER).map((item) => item.fileName)).toEqual([
      'initiative-b.csv',
      'initiative-a.csv',
      'category.json',
      'field.csv',
      'submission.csv',
      'submission_value.json',
      'unknown.csv',
    ]);
  });

  test('summarizes per-file batch results into top-level totals', () => {
    const summary = summarizeBatchResults([
      { totalRows: 3, inserted: 3, updated: 0, skipped: 0, success: true },
      { totalRows: 4, inserted: 2, updated: 0, skipped: 2, success: true },
      { totalRows: 2, inserted: 0, updated: 0, skipped: 2, success: false },
    ]);

    expect(summary).toEqual({
      totalFiles: 3,
      successfulFiles: 2,
      failedFiles: 1,
      totalRows: 9,
      inserted: 5,
      updated: 0,
      skipped: 4,
    });
  });
});
