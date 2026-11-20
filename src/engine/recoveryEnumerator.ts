import { Flight, NetworkData, SpareAircraft } from '../types/network';
import {
  AirportClosure,
  EvaluatedAction,
  RecoveryAction,
  ResultJSON,
} from '../types/engine';
import { parseHHMM } from '../utils/time';
import { runSimulation } from './simulator';

export function getValidSpareSwaps(
  data: NetworkData
): Array<{
  spare: SpareAircraft;
  targetTailId: string;
  fromLegOrder: number;
  flight: Flight;
}> {
  const validSwaps: Array<{
    spare: SpareAircraft;
    targetTailId: string;
    fromLegOrder: number;
    flight: Flight;
  }> = [];

  const spares = data.spare_aircraft || [];
  const flights = data.flights || [];

  for (const spare of spares) {
    const spareAvailMin = parseHHMM(spare.available_from);

    for (const flight of flights) {
      // Spare must be at that leg's origin airport
      if (flight.origin !== spare.base) continue;

      // Must be available by scheduled departure
      const schedDepMin = parseHHMM(flight.dep);
      if (schedDepMin < spareAvailMin) continue;

      validSwaps.push({
        spare,
        targetTailId: flight.tail_id,
        fromLegOrder: flight.leg_order,
        flight,
      });
    }
  }

  return validSwaps;
}

export function enumerateRecoveryActions(
  data: NetworkData,
  closures: AirportClosure[],
  currentResult: ResultJSON
): {
  allActions: EvaluatedAction[];
  top3: EvaluatedAction[];
} {
  const evaluatedActions: EvaluatedAction[] = [];
  const flights = data.flights || [];

  // 1. Enumerate single cancellations
  for (const flight of flights) {
    // Only test cancelling if the flight wasn't already cancelled
    if (currentResult.flights[flight.flight_id]?.is_cancelled) continue;

    const action: RecoveryAction = {
      id: `cancel_${flight.flight_id}`,
      type: 'cancel_flight',
      title: `Cancel flight ${flight.flight_id}`,
      description: `Cancel ${flight.flight_id} (${flight.origin} -> ${flight.destination}, ${flight.dep}) to free aircraft capacity and halt delay propagation.`,
      flight_id: flight.flight_id,
    };

    const simResult = runSimulation(data, closures, {
      forcedCancellations: new Set([flight.flight_id]),
    });

    const affectedFlightIds: string[] = [];
    for (const [fId, afterF] of Object.entries(simResult.flights)) {
      const beforeF = currentResult.flights[fId];
      if (!beforeF) continue;
      if (
        beforeF.actual_dep !== afterF.actual_dep ||
        beforeF.actual_arr !== afterF.actual_arr ||
        beforeF.is_cancelled !== afterF.is_cancelled
      ) {
        affectedFlightIds.push(fId);
      }
    }

    evaluatedActions.push({
      action,
      result: simResult,
      before_kpis: currentResult.kpis,
      after_kpis: simResult.kpis,
      affected_flight_ids: affectedFlightIds,
      rank: 0,
    });
  }

  // 2. Enumerate spare swaps
  const validSwaps = getValidSpareSwaps(data);
  for (const swap of validSwaps) {
    const action: RecoveryAction = {
      id: `swap_${swap.spare.tail_id}_${swap.targetTailId}_leg${swap.fromLegOrder}`,
      type: 'swap_spare',
      title: `Swap spare ${swap.spare.tail_id} onto ${swap.targetTailId} from leg ${swap.fromLegOrder}`,
      description: `Deploy spare ${swap.spare.tail_id} at ${swap.spare.base} to take over ${swap.targetTailId}'s chain starting at flight ${swap.flight.flight_id} (${swap.flight.origin} -> ${swap.flight.destination}, dep ${swap.flight.dep}).`,
      spare_tail_id: swap.spare.tail_id,
      target_tail_id: swap.targetTailId,
      from_leg_order: swap.fromLegOrder,
      flight_id: swap.flight.flight_id,
    };

    // Apply flight override: from this leg onward on targetTailId, tail_id becomes spare.tail_id
    const flightOverrides = new Map<string, Partial<Flight>>();
    for (const f of flights) {
      if (f.tail_id === swap.targetTailId && f.leg_order >= swap.fromLegOrder) {
        flightOverrides.set(f.flight_id, { tail_id: swap.spare.tail_id });
      }
    }

    const simResult = runSimulation(data, closures, {
      flightOverrides,
    });

    const affectedFlightIds: string[] = [];
    for (const [fId, afterF] of Object.entries(simResult.flights)) {
      const beforeF = currentResult.flights[fId];
      if (!beforeF) continue;
      if (
        beforeF.actual_dep !== afterF.actual_dep ||
        beforeF.actual_arr !== afterF.actual_arr ||
        beforeF.tail_id !== afterF.tail_id ||
        beforeF.is_cancelled !== afterF.is_cancelled
      ) {
        affectedFlightIds.push(fId);
      }
    }

    evaluatedActions.push({
      action,
      result: simResult,
      before_kpis: currentResult.kpis,
      after_kpis: simResult.kpis,
      affected_flight_ids: affectedFlightIds,
      rank: 0,
    });
  }

  // 3. Rank actions by:
  // (1) stranded pax asc, then (2) total delay minutes asc, then (3) cancellations asc
  evaluatedActions.sort((a, b) => {
    // Stranded pax asc
    if (a.after_kpis.stranded_pax_total !== b.after_kpis.stranded_pax_total) {
      return a.after_kpis.stranded_pax_total - b.after_kpis.stranded_pax_total;
    }
    // Total delay minutes asc
    if (a.after_kpis.total_delay_minutes !== b.after_kpis.total_delay_minutes) {
      return a.after_kpis.total_delay_minutes - b.after_kpis.total_delay_minutes;
    }
    // Cancellations asc
    return a.after_kpis.cancelled_flights - b.after_kpis.cancelled_flights;
  });

  evaluatedActions.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    allActions: evaluatedActions,
    top3: evaluatedActions.slice(0, 3),
  };
}
