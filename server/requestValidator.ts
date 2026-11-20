import { ResultJSON, EvaluatedAction } from '../src/types/engine';

export interface DispatchRequestBody {
  baseResult: ResultJSON;
  topActions: EvaluatedAction[];
  query?: string;
}

export type ValidationResult =
  | { valid: true; data: DispatchRequestBody }
  | { valid: false; error: string };

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isNonNegativeNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

/**
 * Validates the request body for /api/dispatch against a strict schema.
 * Disallows unknown properties, enforces types, bounds, array lengths, and string sizes.
 */
export function validateDispatchRequestBody(body: unknown): ValidationResult {
  if (!isObject(body)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  // Allowed top-level fields only
  const allowedKeys = new Set(['baseResult', 'topActions', 'query']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unrecognized field in request body: ${key}` };
    }
  }

  // 1. Validate query (optional)
  if (body.query !== undefined) {
    if (typeof body.query !== 'string') {
      return { valid: false, error: 'Field "query" must be a string.' };
    }
    if (body.query.length > 300) {
      return { valid: false, error: 'Field "query" exceeds maximum length of 300 characters.' };
    }
  }

  // 2. Validate topActions (required, array of 1..10 actions)
  if (!Array.isArray(body.topActions)) {
    return { valid: false, error: 'Field "topActions" must be an array.' };
  }
  if (body.topActions.length === 0 || body.topActions.length > 10) {
    return {
      valid: false,
      error: 'Field "topActions" must contain between 1 and 10 evaluated actions.',
    };
  }

  for (let i = 0; i < body.topActions.length; i++) {
    const item = body.topActions[i];
    if (!isObject(item)) {
      return { valid: false, error: `topActions[${i}] must be an object.` };
    }

    if (!isObject(item.action) || typeof item.action.id !== 'string') {
      return { valid: false, error: `topActions[${i}].action is invalid.` };
    }

    if (!Array.isArray(item.affected_flight_ids)) {
      return { valid: false, error: `topActions[${i}].affected_flight_ids must be an array.` };
    }

    if (!isObject(item.before_kpis) || !isObject(item.after_kpis)) {
      return { valid: false, error: `topActions[${i}] KPI objects are invalid.` };
    }
  }

  // 3. Validate baseResult (required ResultJSON)
  const baseResult = body.baseResult;
  if (!isObject(baseResult)) {
    return { valid: false, error: 'Field "baseResult" must be an object.' };
  }

  if (!Array.isArray(baseResult.closures)) {
    return { valid: false, error: 'baseResult.closures must be an array.' };
  }
  if (baseResult.closures.length > 3) {
    return { valid: false, error: 'baseResult.closures exceeds maximum allowed 3 closures.' };
  }

  const kpis = baseResult.kpis;
  if (!isObject(kpis)) {
    return { valid: false, error: 'baseResult.kpis must be an object.' };
  }

  const requiredKpiKeys = [
    'delayed_flights',
    'cancelled_flights',
    'total_delay_minutes',
    'stranded_pax_total',
    'stranded_pax_missed_conn',
    'stranded_pax_cancellations',
    'crews_at_risk',
  ];

  for (const key of requiredKpiKeys) {
    if (!isNonNegativeNumber(kpis[key])) {
      return { valid: false, error: `baseResult.kpis.${key} must be a non-negative number.` };
    }
  }

  if (!isObject(kpis.delay_by_cause)) {
    return { valid: false, error: 'baseResult.kpis.delay_by_cause must be an object.' };
  }

  if (!isObject(baseResult.flights)) {
    return { valid: false, error: 'baseResult.flights must be an object.' };
  }

  return {
    valid: true,
    data: body as unknown as DispatchRequestBody,
  };
}
