function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function validateReportQueryParams(searchParams) {
  const initiativeId = searchParams.get('initiativeId');
  if (initiativeId === null) return { valid: true, initiativeId: null };

  const parsed = asFiniteNumber(initiativeId);
  if (parsed === null || parsed <= 0) {
    return { valid: false, error: 'initiativeId must be a positive number' };
  }
  return { valid: true, initiativeId: parsed };
}

export function validateReportCreatePayload(body) {
  if (!isPlainObject(body)) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const initiativeId = asFiniteNumber(body.initiativeId ?? body.surveyId ?? body.initiative_id);
  if (initiativeId === null || initiativeId <= 0) {
    return { valid: false, error: 'initiativeId is required and must be a positive number' };
  }

  if (body.name !== undefined && typeof body.name !== 'string') {
    return { valid: false, error: 'name must be a string' };
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }

  if (body.filters !== undefined && !isPlainObject(body.filters)) {
    return { valid: false, error: 'filters must be an object of key/value pairs' };
  }

  const expressions = body.expressions ?? [];
  if (!Array.isArray(expressions)) {
    return { valid: false, error: 'expressions must be an array' };
  }
  for (const expr of expressions) {
    if (!isPlainObject(expr)) {
      return { valid: false, error: 'each expression must be an object' };
    }
    if (!isNonEmptyString(expr.attribute)) {
      return { valid: false, error: 'expression.attribute is required' };
    }
    if (!isNonEmptyString(expr.operator)) {
      return { valid: false, error: 'expression.operator is required' };
    }
  }

  const sorts = body.sorts ?? [];
  if (!Array.isArray(sorts)) {
    return { valid: false, error: 'sorts must be an array' };
  }
  for (const sort of sorts) {
    if (!isPlainObject(sort)) {
      return { valid: false, error: 'each sort must be an object' };
    }
    if (!isNonEmptyString(sort.attribute)) {
      return { valid: false, error: 'sort.attribute is required' };
    }
    if (!['asc', 'desc'].includes(String(sort.direction || '').toLowerCase())) {
      return { valid: false, error: 'sort.direction must be "asc" or "desc"' };
    }
  }

  return {
    valid: true,
    value: {
      initiativeId,
      name: body.name || '',
      description: body.description || '',
      createdBy: body.createdBy || '',
      filters: body.filters || {},
      expressions,
      sorts,
      trendConfig: body.trendConfig,
      clientMeta: isPlainObject(body.clientMeta) ? body.clientMeta : {},
    },
  };
}

export function validateReportUpdatePayload(body) {
  if (!isPlainObject(body)) return { valid: false, error: 'Request body must be an object' };
  const id = asFiniteNumber(body.id);
  if (id === null || id <= 0) return { valid: false, error: 'id is required and must be a positive number' };

  if (body.name !== undefined && typeof body.name !== 'string') {
    return { valid: false, error: 'name must be a string' };
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }
  if (body.status !== undefined && !['generating', 'completed', 'failed'].includes(body.status)) {
    return { valid: false, error: 'status must be one of: generating, completed, failed' };
  }
  if (body.name === undefined && body.description === undefined && body.status === undefined) {
    return { valid: false, error: 'No fields to update' };
  }

  return { valid: true, value: { id, name: body.name, description: body.description, status: body.status } };
}

export function validateReportDeleteParams(searchParams) {
  const id = asFiniteNumber(searchParams.get('id'));
  if (id === null || id <= 0) return { valid: false, error: 'id query param is required and must be a positive number' };
  return { valid: true, id };
}
