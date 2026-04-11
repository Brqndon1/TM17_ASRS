export const DEFAULT_IMPORT_ORDER = [
  'initiative',
  'category',
  'field',
  'field_options',
  'submission',
  'submission_value',
  'initiative_budget',
];

export function getImportFileType(fileName) {
  if (typeof fileName !== 'string') return null;
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.csv')) return 'csv';
  if (normalized.endsWith('.json')) return 'json';
  return null;
}

export function inferImportTable(fileName, allowedTables = []) {
  const fileType = getImportFileType(fileName);
  if (!fileType) return null;

  const normalizedBaseName = fileName
    .slice(0, -(fileType.length + 1))
    .toLowerCase();

  return allowedTables.find((tableName) => tableName.toLowerCase() === normalizedBaseName) ?? null;
}

export function sortBatchFilesForExecution(files, importOrder = DEFAULT_IMPORT_ORDER) {
  const orderMap = new Map(importOrder.map((tableName, index) => [tableName, index]));

  return files
    .map((file, originalIndex) => ({ ...file, originalIndex }))
    .sort((left, right) => {
      const leftOrder = orderMap.get(left.inferredTable) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.get(right.inferredTable) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.originalIndex - right.originalIndex;
    })
    .map(({ originalIndex, ...file }) => file);
}

export function summarizeBatchResults(results = []) {
  return results.reduce((summary, result) => ({
    totalFiles: summary.totalFiles + 1,
    successfulFiles: summary.successfulFiles + (result.success ? 1 : 0),
    failedFiles: summary.failedFiles + (result.success ? 0 : 1),
    totalRows: summary.totalRows + (result.totalRows ?? 0),
    inserted: summary.inserted + (result.inserted ?? 0),
    updated: summary.updated + (result.updated ?? 0),
    skipped: summary.skipped + (result.skipped ?? 0),
  }), {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
  });
}
