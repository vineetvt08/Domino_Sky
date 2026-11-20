import { AirportClosure } from '../types/engine';

export interface UrlState {
  scenarioName?: string;
  closures: AirportClosure[];
  viewMode?: 'baseline' | 'disrupted' | 'recovered';
}

export function encodeStateToHash(state: UrlState): string {
  const parts: string[] = [];

  if (state.scenarioName) {
    parts.push(`name=${encodeURIComponent(state.scenarioName)}`);
  }

  if (state.closures && state.closures.length > 0) {
    const closureStrs = state.closures.map(
      (c) => `${c.airport}:${c.start_min}-${c.end_min}`
    );
    parts.push(`closures=${closureStrs.join(',')}`);
  }

  if (state.viewMode) {
    parts.push(`view=${state.viewMode}`);
  }

  return parts.length > 0 ? `#${parts.join('&')}` : '';
}

export function decodeHashToState(): UrlState | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const closures: AirportClosure[] = [];

  const closuresParam = params.get('closures');
  if (closuresParam) {
    const rawList = closuresParam.split(',');
    rawList.forEach((item, idx) => {
      const [airport, times] = item.split(':');
      if (airport && times) {
        const [start, end] = times.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          closures.push({
            id: `shared_closure_${idx + 1}`,
            airport,
            start_min: start,
            end_min: end,
          });
        }
      }
    });
  }

  return {
    scenarioName: params.get('name') ? decodeURIComponent(params.get('name')!) : undefined,
    closures,
    viewMode: (params.get('view') as UrlState['viewMode']) || 'disrupted',
  };
}
