function safeParseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toInitiativeDto(row) {
  if (!row) return null;

  return {
    id: Number(row.initiative_id),
    name: row.initiative_name || '',
    description: row.description || '',
    attributes: safeParseJson(row.attributes, []),
    questions: safeParseJson(row.questions, []),
    settings: safeParseJson(row.settings, {}),
  };
}

export function toInitiativeCreateInput(body = {}) {
  return {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim(),
    attributes: Array.isArray(body.attributes) ? body.attributes : [],
    questions: Array.isArray(body.questions) ? body.questions : [],
    settings: body.settings && typeof body.settings === 'object' ? body.settings : {},
  };
}
