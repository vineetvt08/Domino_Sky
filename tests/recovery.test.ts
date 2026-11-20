import { describe, it, expect } from 'vitest';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';
import { runSimulation } from '../src/engine/simulator';
import { getValidSpareSwaps, enumerateRecoveryActions } from '../src/engine/recoveryEnumerator';
import { AirportClosure } from '../src/types/engine';
import { parseHHMM } from '../src/utils/time';

const data = rawData as NetworkData;

describe('Recovery Actions and Enumerator', () => {
  it('Validates spare swap rules: only swaps where spare is at origin and available before departure', () => {
    const validSwaps = getValidSpareSwaps(data);
    expect(validSwaps.length).toBeGreaterThan(0);

    for (const swap of validSwaps) {
      // Must match base airport
      expect(swap.flight.origin).toBe(swap.spare.base);
      // Scheduled departure must be >= spare availability
      const depMin = parseHHMM(swap.flight.dep);
      const availMin = parseHHMM(swap.spare.available_from);
      expect(depMin).toBeGreaterThanOrEqual(availMin);
    }
  });

  it('Enumerates ~100 candidate actions and correctly ranks top 3 by stranded pax asc, delay asc, cancellations asc', () => {
    // 90-min closure at BOM
    const closures: AirportClosure[] = [
      { id: 'bom_closure', airport: 'BOM', start_min: 840, end_min: 930 }, // 14:00 - 15:30
    ];

    const currentResult = runSimulation(data, closures);
    expect(currentResult.kpis.total_delay_minutes).toBeGreaterThan(0);

    const { allActions, top3 } = enumerateRecoveryActions(data, closures, currentResult);

    // Should enumerate around 70 cancellations + valid swaps (~90-100 total)
    expect(allActions.length).toBeGreaterThanOrEqual(80);
    expect(top3.length).toBe(3);

    // Verify ranking order
    for (let i = 0; i < top3.length - 1; i++) {
      const a = top3[i];
      const b = top3[i + 1];

      if (a.after_kpis.stranded_pax_total === b.after_kpis.stranded_pax_total) {
        if (a.after_kpis.total_delay_minutes === b.after_kpis.total_delay_minutes) {
          expect(a.after_kpis.cancelled_flights).toBeLessThanOrEqual(b.after_kpis.cancelled_flights);
        } else {
          expect(a.after_kpis.total_delay_minutes).toBeLessThanOrEqual(b.after_kpis.total_delay_minutes);
        }
      } else {
        expect(a.after_kpis.stranded_pax_total).toBeLessThanOrEqual(b.after_kpis.stranded_pax_total);
      }
    }

    // Top action must have before/after KPIs and affected flight IDs
    const best = top3[0];
    expect(best.before_kpis).toBeDefined();
    expect(best.after_kpis).toBeDefined();
    expect(best.affected_flight_ids.length).toBeGreaterThan(0);
    expect(best.rank).toBe(1);
  });
});
