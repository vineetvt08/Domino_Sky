import { AirportClosure } from '../types/engine';

export interface UrlState {
  scenarioName?: string;
  closures: AirportClosure[];
  viewMode?: 'baseline' | 'disrupted' | 'recovered';
}

const KNOWN_AIRPORT_IDS = new Set([
  'DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA', 'AMD', 'GOI',
  'COK', 'PNQ', 'GAU', 'JAI', 'LKO', 'IXB', 'SXR', 'PAT',
]);

const VALID_VIEW_MODES = new Set(['baseline', 'disrupted', 'recovered']);

export function encodeStateToHash(state: UrlState): string {
  const parts: string[] = [];

  if (state.scenarioName) {
    const cleanName = state.scenarioName.slice(0, 60).replace(/[<>"']/g, '');
    parts.push(`name=${encodeURIComponent(cleanName)}`);
  }

  if (state.closures && state.closures.length > 0) {
    // Encode up to 3 valid closures
    const validClosures = state.closures
      .filter((c) => KNOWN_AIRPORT_IDS.has(c.airport.toUpperCase()))
      .slice(0, 3);

    const closureStrs = validClosures.map(
      (c) => `${c.airport.toUpperCase()}:${Math.round(c.start_min)}-${Math.round(c.end_min)}`
    );
    if (closureStrs.length > 0) {
      parts.push(`closures=${closureStrs.join(',')}`);
    }
  }

  if (state.viewMode && VALID_VIEW_MODES.has(state.viewMode)) {
    parts.push(`view=${state.viewMode}`);
  }

  return parts.length > 0 ? `#${parts.join('&')}` : '';
}

export function decodeHashToState(): UrlState | null {
  try {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const closures: AirportClosure[] = [];

    const closuresParam = params.get('closures');
    if (closuresParam) {
      const rawList = closuresParam.split(',').slice(0, 3); // Max 3 closures
      rawList.forEach((item, idx) => {
        const [rawAirport, times] = item.split(':');
        if (!rawAirport || !times) return;

        const airport = rawAirport.trim().toUpperCase();
        // Airport code must be recognized
        if (!KNOWN_AIRPORT_IDS.has(airport)) return;

        const timeParts = times.split('-');
        if (timeParts.length !== 2) return;

        const start = parseInt(timeParts[0] ?? '', 10);
        const end = parseInt(timeParts[1] ?? '', 10);

        // Bounds: 00:00 to 24:00 (0..1440), start < end, min duration 15m
        if (
          !isNaN(start) &&
          !isNaN(end) &&
          start >= 0 &&
          end <= 1440 &&
          start < end &&
          end - start >= 15
        ) {
          closures.push({
            id: `shared_closure_${idx + 1}`,
            airport,
            start_min: start,
            end_min: end,
          });
        }
      });
    }

    // Sanitize scenario name
    let scenarioName: string | undefined = undefined;
    const rawName = params.get('name');
    if (rawName) {
      try {
        const decoded = decodeURIComponent(rawName);
        scenarioName = decoded.slice(0, 60).replace(/[<>"'\\]/g, '').trim() || undefined;
      } catch {
        scenarioName = undefined;
      }
    }

    // Validate view mode
    const rawView = params.get('view');
    const viewMode: UrlState['viewMode'] =
      rawView && VALID_VIEW_MODES.has(rawView)
        ? (rawView as UrlState['viewMode'])
        : 'disrupted';

    return {
      scenarioName,
      closures,
      viewMode,
    };
  } catch {
    // If any parsing error occurs, safely return null without throwing
    return null;
  }
}
