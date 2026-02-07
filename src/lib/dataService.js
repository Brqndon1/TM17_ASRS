/**
 * ============================================================================
 * DATA SERVICE — The central hub for all data retrieval in the application.
 * ============================================================================
 *
 * HOW THIS WORKS RIGHT NOW (DUMMY DATA MODE):
 * - This file imports data directly from JSON files stored in src/data/.
 * - The JSON files contain fake/sample data so we can test the UI.
 * - Each function below returns data in the exact format our components expect.
 *
 * ============================================================================
 * [API ADJUSTMENT] — WHAT TO CHANGE WHEN THE DATABASE & API ARE READY:
 * ============================================================================
 * When your team builds the backend API, you will:
 *
 * 1. REMOVE the three import lines at the top (the ones importing JSON files).
 *
 * 2. REPLACE each function's body with a "fetch" call to your API endpoint.
 *    For example, instead of:
 *      return initiativesData.initiatives;
 *    You would write:
 *      const response = await fetch('https://your-api-url.com/api/initiatives');
 *      const data = await response.json();
 *      return data.initiatives;
 *
 * 3. Make sure each function is marked as "async" (they already are).
 *
 * 4. The API should return JSON in the SAME STRUCTURE as the dummy JSON files.
 *    If the API returns a different structure, you'll need to transform the
 *    data inside these functions before returning it to the components.
 * ============================================================================
 */

// These three lines import our dummy JSON data files.
// [API ADJUSTMENT] DELETE these three lines when switching to real API calls.
import initiativesData from '@/data/initiatives.json';
import reportDataFile from '@/data/reportData.json';
import trendDataFile from '@/data/trendData.json';

/**
 * getInitiatives()
 * Returns the list of all ASRS initiatives (id, name, description, attributes).
 * Components use this to populate the initiative selector cards.
 *
 * [API ADJUSTMENT] Replace the body with:
 *   const response = await fetch('https://your-api-url.com/api/initiatives');
 *   const data = await response.json();
 *   return data.initiatives;
 */
export async function getInitiatives() {
  return initiativesData.initiatives;
}

/**
 * getReportData(initiativeId)
 * Returns the full report data for one specific initiative.
 * This includes: summary stats, chart data, and table data.
 *
 * @param {number|string} initiativeId - The ID of the initiative (1-7).
 *
 * [API ADJUSTMENT] Replace the body with:
 *   const response = await fetch(`https://your-api-url.com/api/reports/${initiativeId}`);
 *   const data = await response.json();
 *   return data;
 */
export async function getReportData(initiativeId) {
  return reportDataFile.reports[String(initiativeId)] || null;
}

/**
 * getTrendData(initiativeId)
 * Returns the trend analysis data for one specific initiative.
 * Only returns trends where enabledDisplay is true.
 *
 * @param {number|string} initiativeId - The ID of the initiative (1-7).
 *
 * [API ADJUSTMENT] Replace the body with:
 *   const response = await fetch(`https://your-api-url.com/api/trends/${initiativeId}`);
 *   const data = await response.json();
 *   return data.filter(trend => trend.enabledDisplay);
 */
export async function getTrendData(initiativeId) {
  const allTrends = trendDataFile.trends[String(initiativeId)] || [];
  // Only return trends that are enabled for display (per requirement REP010/REP028)
  return allTrends.filter(trend => trend.enabledDisplay);
}

/**
 * getFilteredReportData(initiativeId, filters)
 * Returns report table data filtered by the given criteria.
 * Filters is an object like { grade: "7th", school: "Lincoln MS" }.
 *
 * @param {number|string} initiativeId - The initiative to get data for.
 * @param {Object} filters - Key-value pairs of attribute names and their filter values.
 *
 * [API ADJUSTMENT] Replace the body with:
 *   const queryParams = new URLSearchParams(filters).toString();
 *   const response = await fetch(
 *     `https://your-api-url.com/api/reports/${initiativeId}/filter?${queryParams}`
 *   );
 *   const data = await response.json();
 *   return data;
 */
export async function getFilteredReportData(initiativeId, filters) {
  const report = reportDataFile.reports[String(initiativeId)];
  if (!report) return [];

  // Apply filters to the table data locally (simulating database WHERE clauses)
  let filteredData = [...report.tableData];

  // Loop through each filter the user has selected
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All') {
      filteredData = filteredData.filter(row => {
        // Convert the key from display format to camelCase to match JSON keys
        const camelKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s/g, '');
        return String(row[camelKey]).toLowerCase().includes(String(value).toLowerCase());
      });
    }
  });

  return filteredData;
}

/**
 * getSortedReportData(data, sortConfig)
 * Sorts an array of report rows based on sort configuration.
 * sortConfig is an array of { attribute, direction } objects.
 *
 * @param {Array} data - The data rows to sort.
 * @param {Array} sortConfig - Array of { attribute: string, direction: 'asc'|'desc' }.
 * @returns {Array} The sorted data.
 *
 * [API ADJUSTMENT] When the API handles sorting, you would pass sort params
 * in the query string instead of sorting client-side:
 *   const sortParams = sortConfig.map(s => `${s.attribute}:${s.direction}`).join(',');
 *   const response = await fetch(
 *     `https://your-api-url.com/api/reports/${initiativeId}?sort=${sortParams}`
 *   );
 */
export function getSortedReportData(data, sortConfig) {
  if (!sortConfig || sortConfig.length === 0) return data;

  const sorted = [...data];
  sorted.sort((a, b) => {
    for (const { attribute, direction } of sortConfig) {
      const key = attribute.charAt(0).toLowerCase() + attribute.slice(1).replace(/\s/g, '');
      const valA = a[key];
      const valB = b[key];

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      if (comparison !== 0) {
        return direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });

  return sorted;
}