import { describe, it, expect } from 'vitest';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';
import { runSimulation } from '../src/engine/simulator';
import { AirportClosure } from '../src/types/engine';
import { enumerateRecoveryActions } from '../src/engine/recoveryEnumerator';

const data = rawData as NetworkData;

describe('Simulation Mathematical Invariants', () => {
  const airports = ['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA'];

  // Test across 15 randomized but valid scenarios
  for (let seed = 1; seed <= 15; seed++) {
    const airport = airports[seed % airports.length]!;
    const startMin = 300 + (seed * 50) % 600;
    const duration = 60 + (seed * 20) % 90;
    const endMin = startMin + duration;

    it(`Invariant check: Scenario seed ${seed} (${airport} ${startMin}-${endMin})`, () => {
      const closures: AirportClosure[] = [
        {
          id: `closure_prop_${seed}`,
          airport,
          start_min: startMin,
          end_min: endMin,
        },
      ];

      const result = runSimulation(data, closures);

      // Invariant 1: actual_arr_min >= actual_dep_min for non-cancelled flights
      for (const flight of Object.values(result.flights)) {
        if (!flight.is_cancelled) {
          expect(flight.actual_arr_min).toBeGreaterThanOrEqual(flight.actual_dep_min);
          // Invariant 2: delay_minutes >= 0
          expect(flight.delay_minutes).toBeGreaterThanOrEqual(0);
          expect(flight.actual_dep_min).toBeGreaterThanOrEqual(flight.planned_dep_min);
        }
      }

      // Invariant 3: Total stranded pax equals sum of missed connections + cancelled flights
      const { kpis } = result;
      expect(kpis.stranded_pax_total).toBe(
        kpis.stranded_pax_missed_connections + kpis.stranded_pax_cancelled_flights
      );
      expect(kpis.stranded_pax_total).toBeGreaterThanOrEqual(0);
      expect(kpis.total_delay_minutes).toBeGreaterThanOrEqual(0);
      expect(kpis.delayed_flights).toBeGreaterThanOrEqual(0);
      expect(kpis.cancelled_flights).toBeGreaterThanOrEqual(0);

      // Invariant 4: Sum of delay_by_cause breakdown equals total delay minutes
      const causeSum =
        kpis.delay_by_cause.closure_hold +
        kpis.delay_by_cause.aircraft_knock_on +
        kpis.delay_by_cause.crew_limit +
        kpis.delay_by_cause.none;
      expect(causeSum).toBe(kpis.total_delay_minutes);

      // Invariant 5: Recovery actions reduce or maintain stranded passengers
      if (kpis.stranded_pax_total > 50) {
        const { top3 } = enumerateRecoveryActions(data, closures, result);
        if (top3.length > 0) {
          const best = top3[0]!;
          expect(best.after_kpis.stranded_pax_total).toBeLessThanOrEqual(
            kpis.stranded_pax_total
          );
        }
      }
    });
  }
});
