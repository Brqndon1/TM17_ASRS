export function derivePreviewAttributes(attributes = [], tableData = []) {
  const normalized = new Set();
  const ordered = [];

  for (const attribute of attributes) {
    if (!attribute || normalized.has(attribute)) continue;
    normalized.add(attribute);
    ordered.push(attribute);
  }

  if (tableData.length === 0) return ordered;

  for (const key of Object.keys(tableData[0])) {
    if (key === 'id' || key === 'submission_id' || key === 'submitted_at') continue;
    if (normalized.has(key)) continue;
    normalized.add(key);
    ordered.push(key);
  }

  return ordered;
}
