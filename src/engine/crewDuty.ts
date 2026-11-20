import { Crew } from '../types/network';
import { CrewDutyResult, FlightResult } from '../types/engine';
import { parseHHMM } from '../utils/time';

export interface CrewEvaluation {
  crews: Record<string, CrewDutyResult>;
  timedOutFlightIds: string[];
  crewsAtRiskCount: number;
  crewsTimedOutCount: number;
}

/**
 * Evaluates flight crew duty limitations under legal civil aviation mandates (max 600 minutes).
 *
 * Rules:
 * - Duty duration = `last_flight.actual_arr_min - duty_start`.
 * - If duty > 600 min, crew times out; subsequent flights are flagged for cancellation (cause: crew_limit).
 * - Crews within 30 min of the 600m threshold are classified as "at risk".
 *
 * @param crews Array of crew assignments from flight_network.json
 * @param flights Simulated flight results
 * @returns CrewEvaluation with per-crew duty used, at-risk counts, and timed-out flight IDs
 */
export function evaluateCrewDuty(
  crews: Crew[],
  flights: Record<string, FlightResult>
): CrewEvaluation {
  const crewResults: Record<string, CrewDutyResult> = {};
  const newlyTimedOutFlightIds: string[] = [];
  let crewsAtRiskCount = 0;
  let crewsTimedOutCount = 0;

  for (const crew of crews) {
    const dutyStartMin = parseHHMM(crew.duty_start);
    const maxDuty = crew.max_duty_mins ?? 600;

    const assignedFlightIds = crew.flight_ids || [];
    const flownFlightIds: string[] = [];
    const cancelledFlightIds: string[] = [];
    let lastArrMin = dutyStartMin;
    let timedOut = false;

    for (const fId of assignedFlightIds) {
      const flight = flights[fId];
      if (!flight) continue;

      if (flight.is_cancelled) {
        cancelledFlightIds.push(fId);
        continue;
      }

      // If already timed out, subsequent flights cannot be flown
      if (timedOut) {
        newlyTimedOutFlightIds.push(fId);
        cancelledFlightIds.push(fId);
        continue;
      }

      const dutyAtArrival = flight.actual_arr_min - dutyStartMin;
      if (dutyAtArrival > maxDuty) {
        // Flight cannot be legally flown
        timedOut = true;
        newlyTimedOutFlightIds.push(fId);
        cancelledFlightIds.push(fId);
      } else {
        flownFlightIds.push(fId);
        lastArrMin = Math.max(lastArrMin, flight.actual_arr_min);
      }
    }

    const dutyUsedMins = flownFlightIds.length > 0 ? lastArrMin - dutyStartMin : 0;
    const isAtRisk =
      !timedOut &&
      dutyUsedMins >= maxDuty - 30 &&
      dutyUsedMins <= maxDuty;

    if (timedOut) crewsTimedOutCount++;
    if (isAtRisk) crewsAtRiskCount++;

    crewResults[crew.crew_id] = {
      crew_id: crew.crew_id,
      tail_id: crew.tail_id,
      base: crew.base,
      duty_start: crew.duty_start,
      duty_start_min: dutyStartMin,
      max_duty_mins: maxDuty,
      duty_used_mins: dutyUsedMins,
      is_timed_out: timedOut,
      is_at_risk: isAtRisk,
      last_flight_arr_min: lastArrMin,
      flight_ids: assignedFlightIds,
      flown_flight_ids: flownFlightIds,
      cancelled_flight_ids: cancelledFlightIds,
    };
  }

  return {
    crews: crewResults,
    timedOutFlightIds: newlyTimedOutFlightIds,
    crewsAtRiskCount,
    crewsTimedOutCount,
  };
}
