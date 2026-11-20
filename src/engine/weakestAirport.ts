import { NetworkData } from '../types/network';
import { AirportClosure, ResultJSON } from '../types/engine';
import { runSimulation } from './simulator';

export interface WeakestAirportResult {
  airport_id: string;
  name: string;
  city: string;
  tier: string;
  total_delay_minutes: number;
  stranded_pax_total: number;
  delayed_flights: number;
  cancelled_flights: number;
  rank: number;
  simulation: ResultJSON;
}

/**
 * Runs a 1-hour sensitivity stress-test across all 16 airports in the network.
 *
 * For each airport, simulates a 60-minute shutdown during peak traffic hours (10:00-11:00 IST),
 * measures system-wide disruption cascade, and ranks airports from most vulnerable to least:
 * 1. Stranded passengers descending (higher impact ranks first)
 * 2. Total network delay minutes descending
 *
 * @param data Complete NetworkData flight graph
 * @param windowStartMin Test window start minute (default: 600 / 10:00 IST)
 * @param durationMin Test closure duration in minutes (default: 60 min)
 * @returns Array of WeakestAirportResult sorted by descending network vulnerability
 */
export function simulateWeakestAirports(
  data: NetworkData,
  windowStartMin: number = 600, // 10:00 IST
  durationMin: number = 60     // 1 hour
): WeakestAirportResult[] {
  const airports = data.airports || [];
  const results: WeakestAirportResult[] = [];

  for (const ap of airports) {
    const closure: AirportClosure = {
      id: `closure_weakest_${ap.id}`,
      airport: ap.id,
      start_min: windowStartMin,
      end_min: windowStartMin + durationMin,
    };

    const sim = runSimulation(data, [closure]);

    results.push({
      airport_id: ap.id,
      name: ap.name,
      city: ap.city,
      tier: ap.tier,
      total_delay_minutes: sim.kpis.total_delay_minutes,
      stranded_pax_total: sim.kpis.stranded_pax_total,
      delayed_flights: sim.kpis.delayed_flights,
      cancelled_flights: sim.kpis.cancelled_flights,
      rank: 0,
      simulation: sim,
    });
  }

  // Rank by stranded pax desc, then total delay desc
  results.sort((a, b) => {
    if (b.stranded_pax_total !== a.stranded_pax_total) {
      return b.stranded_pax_total - a.stranded_pax_total;
    }
    return b.total_delay_minutes - a.total_delay_minutes;
  });

  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results;
}
