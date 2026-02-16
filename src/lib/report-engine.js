/**
 * ============================================================================
 * REPORT ENGINE — Pure utility functions for the report creation pipeline.
 * ============================================================================
 * Shared by both client-side preview (Step 4) and server-side generation (API).
 * Pipeline: filter → expressions → sort → compute metrics
 * ============================================================================
 */

/**
 * toCamelKey — Converts a display name to the camelCase key used in table data.
 * "Interest Level" → "interestLevel", "Grade" → "grade"
 */
export function toCamelKey(displayName) {
  const words = displayName.trim().split(/\s+/);
  return words
    .map((w, i) =>
      i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join('');
}

/**
 * applyFilters — Equality filters matching the data-service.js pattern.
 * filters is an object like { Grade: "7th", School: "Lincoln MS" }.
 */
export function applyFilters(tableData, filters) {
  if (!filters || Object.keys(filters).length === 0) return [...tableData];

  let filtered = [...tableData];
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All') {
      const camelKey = toCamelKey(key);
      filtered = filtered.filter(row => {
        const rowKey = Object.keys(row).find(k => k.toLowerCase() === camelKey.toLowerCase());
        if (!rowKey) return true;
        return String(row[rowKey]).toLowerCase().includes(String(value).toLowerCase());
      });
    }
  });
  return filtered;
}

/**
 * evaluateExpression — Evaluates a single boolean expression against a row.
 * expression: { attribute, operator, value }
 * Operators: =, !=, >, <, >=, <=, contains
 */
export function evaluateExpression(row, expression) {
  const { attribute, operator, value } = expression;
  const camelKey = toCamelKey(attribute);
  const rowKey = Object.keys(row).find(k => k.toLowerCase() === camelKey.toLowerCase());
  if (!rowKey) return true;

  const rowVal = row[rowKey];
  const numRow = Number(rowVal);
  const numTarget = Number(value);
  const isNumeric = !isNaN(numRow) && !isNaN(numTarget) && String(value).trim() !== '';

  switch (operator) {
    case '=':
      return isNumeric ? numRow === numTarget : String(rowVal).toLowerCase() === String(value).toLowerCase();
    case '!=':
      return isNumeric ? numRow !== numTarget : String(rowVal).toLowerCase() !== String(value).toLowerCase();
    case '>':
      return isNumeric ? numRow > numTarget : String(rowVal) > String(value);
    case '<':
      return isNumeric ? numRow < numTarget : String(rowVal) < String(value);
    case '>=':
      return isNumeric ? numRow >= numTarget : String(rowVal) >= String(value);
    case '<=':
      return isNumeric ? numRow <= numTarget : String(rowVal) <= String(value);
    case 'contains':
      return String(rowVal).toLowerCase().includes(String(value).toLowerCase());
    default:
      return true;
  }
}

/**
 * applyExpressionFilter — Filters rows by a list of boolean expressions.
 * Connectors (AND/OR) are evaluated left-to-right with no precedence.
 * expressions: [{ attribute, operator, value, connector? }]
 */
export function applyExpressionFilter(tableData, expressions) {
  if (!expressions || expressions.length === 0) return [...tableData];

  return tableData.filter(row => {
    let result = evaluateExpression(row, expressions[0]);

    for (let i = 1; i < expressions.length; i++) {
      const expr = expressions[i];
      const exprResult = evaluateExpression(row, expr);

      if (expr.connector === 'OR') {
        result = result || exprResult;
      } else {
        // Default to AND
        result = result && exprResult;
      }
    }

    return result;
  });
}

/**
 * applySorting — Multi-level sort matching data-service.js getSortedReportData.
 * sortConfig: [{ attribute, direction }]
 */
export function applySorting(tableData, sortConfig) {
  if (!sortConfig || sortConfig.length === 0) return [...tableData];

  const sorted = [...tableData];
  sorted.sort((a, b) => {
    for (const { attribute, direction } of sortConfig) {
      const key = toCamelKey(attribute);
      const rowKeyA = Object.keys(a).find(k => k.toLowerCase() === key.toLowerCase());
      const rowKeyB = Object.keys(b).find(k => k.toLowerCase() === key.toLowerCase());
      const valA = rowKeyA ? a[rowKeyA] : undefined;
      const valB = rowKeyB ? b[rowKeyB] : undefined;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA ?? '').localeCompare(String(valB ?? ''));
      }

      if (comparison !== 0) {
        return direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
  return sorted;
}

/**
 * computeMetrics — Calculates summary metrics from filtered data.
 * Returns: { totalRows, totalRowsUnfiltered, filterMatchRate,
 *            numericAverages, categoryCounts }
 */
export function computeMetrics(filteredData, unfilteredData, attributes) {
  const totalRows = filteredData.length;
  const totalRowsUnfiltered = unfilteredData.length;
  const filterMatchRate = totalRowsUnfiltered > 0
    ? Math.round((totalRows / totalRowsUnfiltered) * 1000) / 10
    : 0;

  const numericAverages = {};
  const categoryCounts = {};

  attributes.forEach(attr => {
    const camelKey = toCamelKey(attr);
    const matchingKey = filteredData.length > 0
      ? Object.keys(filteredData[0]).find(k => k.toLowerCase() === camelKey.toLowerCase())
      : null;

    if (!matchingKey) return;

    // Determine if this attribute is numeric by checking the first non-null value
    const sampleValues = filteredData
      .map(row => row[matchingKey])
      .filter(v => v !== undefined && v !== null);

    if (sampleValues.length === 0) return;

    const isNumeric = sampleValues.every(v => !isNaN(Number(v)));

    if (isNumeric) {
      const nums = sampleValues.map(Number);
      const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
      numericAverages[attr] = Math.round(avg * 100) / 100;
    } else {
      const counts = {};
      sampleValues.forEach(v => {
        const s = String(v);
        counts[s] = (counts[s] || 0) + 1;
      });
      categoryCounts[attr] = counts;
    }
  });

  return { totalRows, totalRowsUnfiltered, filterMatchRate, numericAverages, categoryCounts };
}

/**
 * processReportData — Full pipeline: filter → expressions → sort → metrics.
 * Returns { filteredData, metrics }.
 */
export function processReportData(tableData, filters, expressions, sortConfig, attributes) {
  const unfilteredData = [...tableData];

  // Step 1: Apply equality filters
  let data = applyFilters(tableData, filters);

  // Step 2: Apply boolean expressions
  data = applyExpressionFilter(data, expressions);

  // Step 3: Apply sorting
  data = applySorting(data, sortConfig);

  // Step 4: Compute metrics
  const metrics = computeMetrics(data, unfilteredData, attributes);

  return { filteredData: data, metrics };
}
