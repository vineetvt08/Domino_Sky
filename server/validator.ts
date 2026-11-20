import { ResultJSON, SimulationKPIs, EvaluatedAction } from '../src/types/engine';

export interface DispatcherAiResponse {
  summary: string;
  options: Array<{
    id: string;
    rationale: string;
  }>;
  caveats: string;
}

export interface ValidationReport {
  valid: boolean;
  unmatchedNumbers: string[];
  invalidOptionIds: string[];
  totalNumbersChecked: number;
  correctedCount: number;
}

/**
 * Normalizes numbers: removes commas, converts HH:MM to normalized time string or integer
 */
export function normalizeNumberStr(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

/**
 * Collects all allowed numbers and times from the simulation input (ResultJSON and top actions)
 */
export function collectAllowedNumbers(
  baseResult: ResultJSON,
  actions: EvaluatedAction[]
): Set<string> {
  const allowed = new Set<string>();

  function addVal(val: unknown) {
    if (val === null || val === undefined) return;
    if (typeof val === 'number') {
      allowed.add(val.toString());
      allowed.add(val.toLocaleString());
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
        // HH:MM time
        allowed.add(trimmed);
        const parts = trimmed.split(':').map(Number);
        const h = parts[0];
        const m = parts[1];
        if (h !== undefined && m !== undefined) {
          allowed.add(h.toString());
          allowed.add(m.toString());
        }
      } else if (!isNaN(Number(trimmed))) {
        allowed.add(trimmed);
      }
    }
  }

  function addKpis(kpis: SimulationKPIs) {
    addVal(kpis.delayed_flights);
    addVal(kpis.cancelled_flights);
    addVal(kpis.total_delay_minutes);
    addVal(kpis.stranded_pax_total);
    addVal(kpis.stranded_pax_missed_connections);
    addVal(kpis.stranded_pax_cancelled_flights);
    addVal(kpis.crews_at_risk);
    addVal(kpis.crews_timed_out);
    addVal(kpis.delay_by_cause.closure_hold);
    addVal(kpis.delay_by_cause.aircraft_knock_on);
    addVal(kpis.delay_by_cause.crew_limit);
  }

  // Base KPIs
  addKpis(baseResult.kpis);

  // Closures
  for (const c of baseResult.closures || []) {
    addVal(c.start_min);
    addVal(c.end_min);
    addVal(c.end_min - c.start_min);
  }

  // Flights
  for (const f of Object.values(baseResult.flights || {})) {
    addVal(f.pax);
    addVal(f.delay_minutes);
    addVal(f.leg_order);
    addVal(f.planned_dep);
    addVal(f.planned_arr);
    addVal(f.actual_dep);
    addVal(f.actual_arr);
  }

  // Evaluated Actions
  for (const item of actions) {
    addKpis(item.before_kpis);
    addKpis(item.after_kpis);
    addVal(item.rank);
    if (item.action.from_leg_order) {
      addVal(item.action.from_leg_order);
    }
  }

  // Allow standard small enumeration numbers 1..5 (for "Option 1", "top 3", etc.)
  ['1', '2', '3', '4', '5'].forEach((n) => allowed.add(n));

  return allowed;
}

/**
 * Extracts all numbers and times from text
 */
export function extractNumbersAndTimes(text: string): string[] {
  if (!text) return [];
  // Match HH:MM times or standalone numbers (including with commas like 1,240 or decimals)
  const matches = text.match(/\b(?:\d{1,2}:\d{2}|\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\b/g);
  return matches ? matches.map((m) => m.trim()) : [];
}

/**
 * Validates AI response strictly against engine output
 */
export function validateDispatcherResponse(
  response: DispatcherAiResponse,
  baseResult: ResultJSON,
  allowedOptions: EvaluatedAction[]
): ValidationReport {
  const allowedNumbers = collectAllowedNumbers(baseResult, allowedOptions);
  const allowedOptionIds = new Set(allowedOptions.map((o) => o.action.id));

  const unmatchedNumbers: string[] = [];
  const invalidOptionIds: string[] = [];
  let totalNumbersChecked = 0;

  // Check Option IDs
  for (const opt of response.options || []) {
    if (!allowedOptionIds.has(opt.id)) {
      invalidOptionIds.push(opt.id);
    }
  }

  // Check all text fields
  const textsToCheck: string[] = [
    response.summary || '',
    response.caveats || '',
    ...(response.options || []).map((o) => o.rationale || ''),
  ];

  for (const text of textsToCheck) {
    const extracted = extractNumbersAndTimes(text);
    for (const num of extracted) {
      totalNumbersChecked++;
      const normalized = normalizeNumberStr(num);

      // Check if raw or normalized number exists in allowed set
      const isAllowed =
        allowedNumbers.has(num) ||
        allowedNumbers.has(normalized) ||
        Array.from(allowedNumbers).some((a) => normalizeNumberStr(a) === normalized);

      if (!isAllowed) {
        unmatchedNumbers.push(num);
      }
    }
  }

  return {
    valid: unmatchedNumbers.length === 0 && invalidOptionIds.length === 0,
    unmatchedNumbers: Array.from(new Set(unmatchedNumbers)),
    invalidOptionIds: Array.from(new Set(invalidOptionIds)),
    totalNumbersChecked,
    correctedCount: 0,
  };
}

/**
 * Generates deterministic fallback text for options
 */
export function buildDeterministicTemplate(
  baseResult: ResultJSON,
  topActions: EvaluatedAction[]
): DispatcherAiResponse {
  const kpis = baseResult.kpis;
  const summary = `Disruption caused ${kpis.delayed_flights} delayed flights (${kpis.total_delay_minutes} total delay minutes) and ${kpis.stranded_pax_total} stranded passengers (${kpis.stranded_pax_missed_connections} on missed connections, ${kpis.stranded_pax_cancelled_flights} on cancelled flights).`;

  const options = topActions.slice(0, 3).map((item) => {
    const paxSaved = item.before_kpis.stranded_pax_total - item.after_kpis.stranded_pax_total;
    const delaySaved = item.before_kpis.total_delay_minutes - item.after_kpis.total_delay_minutes;
    return {
      id: item.action.id,
      rationale: `${item.action.title}. Reduces stranded passengers from ${item.before_kpis.stranded_pax_total} to ${item.after_kpis.stranded_pax_total} (saved ${paxSaved}) and total delay minutes from ${item.before_kpis.total_delay_minutes} to ${item.after_kpis.total_delay_minutes} (saved ${delaySaved}).`,
    };
  });

  const caveats = `All recovery actions must be coordinated with ground operations and gate dispatch. Ensure crew rest regulations are verified.`;

  return {
    summary,
    options,
    caveats,
  };
}
