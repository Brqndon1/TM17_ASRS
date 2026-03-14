// Lightweight survey payload validation and sanitization
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeValue(v, depth = 0) {
  const MAX_DEPTH = 3;
  const MAX_STRING = 1000;
  if (depth > MAX_DEPTH) return null;
  if (v === null) return null;
  if (typeof v === 'string') return v.trim().slice(0, MAX_STRING);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) {
    return v.slice(0, 100).map((it) => sanitizeValue(it, depth + 1));
  }
  if (isPlainObject(v)) {
    const out = {};
    const keys = Object.keys(v).slice(0, 500);
    for (const k of keys) {
      const keyName = String(k).slice(0, 100);
      out[keyName] = sanitizeValue(v[k], depth + 1);
    }
    return out;
  }
  return String(v).slice(0, MAX_STRING);
}

export function validateAndCleanSurvey(body) {
  if (!isPlainObject(body)) throw new Error('Invalid payload');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const responses = body.responses;

  if (!name) throw new Error('Missing or invalid `name`');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Missing or invalid `email`');
  if (!isPlainObject(responses)) throw new Error('Missing or invalid `responses` object');

  const cleanedResponses = {};
  const keys = Object.keys(responses).slice(0, 500);
  for (const k of keys) {
    const keyName = String(k).slice(0, 100);
    cleanedResponses[keyName] = sanitizeValue(responses[k]);
  }

  const cleaned = {
    name: name.slice(0, 200),
    email: email.slice(0, 200),
    responses: cleanedResponses,
  };

  if (body.templateId) cleaned.templateId = String(body.templateId).slice(0, 100);

  return cleaned;
}

export default { validateAndCleanSurvey };
