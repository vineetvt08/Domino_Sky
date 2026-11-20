import { Connection } from '../types/network';
import { ConnectionResult, FlightResult } from '../types/engine';

export interface EvaluatedConnections {
  connections: Record<string, ConnectionResult>;
  missedCount: number;
  missedPassengersTotal: number;
}

export function evaluateConnections(
  rawConnections: Connection[],
  flights: Record<string, FlightResult>
): EvaluatedConnections {
  const connections: Record<string, ConnectionResult> = {};
  let missedCount = 0;
  let missedPassengersTotal = 0;

  for (const conn of rawConnections) {
    const from = flights[conn.from_flight];
    const to = flights[conn.to_flight];

    if (!from || !to) {
      continue;
    }

    const plannedConnectionTime = to.planned_dep_min - from.planned_arr_min;
    let actualConnectionTime = 0;
    let isMissed = false;
    let missedReason: 'insufficient_turnaround' | 'from_cancelled' | 'to_cancelled' | undefined;

    if (from.is_cancelled) {
      isMissed = true;
      missedReason = 'from_cancelled';
      actualConnectionTime = -999;
    } else if (to.is_cancelled) {
      isMissed = true;
      missedReason = 'to_cancelled';
      actualConnectionTime = -999;
    } else {
      actualConnectionTime = to.actual_dep_min - from.actual_arr_min;
      if (actualConnectionTime < conn.min_connect_minutes) {
        isMissed = true;
        missedReason = 'insufficient_turnaround';
      }
    }

    if (isMissed) {
      missedCount++;
      // Only count if neither flight was cancelled (so cancelled flight pax aren't double counted)
      if (!from.is_cancelled && !to.is_cancelled) {
        missedPassengersTotal += conn.passengers;
      }
    }

    connections[conn.connection_id] = {
      connection_id: conn.connection_id,
      airport: conn.airport,
      from_flight: conn.from_flight,
      to_flight: conn.to_flight,
      passengers: conn.passengers,
      min_connect_minutes: conn.min_connect_minutes,
      planned_connection_time: plannedConnectionTime,
      actual_connection_time: actualConnectionTime,
      is_missed: isMissed,
      missed_reason: missedReason,
    };
  }

  return {
    connections,
    missedCount,
    missedPassengersTotal,
  };
}
