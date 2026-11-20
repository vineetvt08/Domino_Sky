import { Flight, NetworkData } from '../types/network';
import {
  AirportClosure,
  AirportImpact,
  DelayCause,
  EngineSettings,
  FlightResult,
  ResultJSON,
  SimulationKPIs,
} from '../types/engine';
import { parseHHMM, formatHHMM } from '../utils/time';
import { evaluateConnections } from './connectionTracker';
import { evaluateCrewDuty } from './crewDuty';

export interface SinglePassOptions {
  cancelledFlightIds?: Set<string>;
  flightOverrides?: Map<string, Partial<Flight>>;
  settings?: Partial<EngineSettings>;
}

export function resolveClosure(
  airportId: string,
  min: number,
  closures: AirportClosure[]
): { resolvedMin: number; held: boolean; heldBy?: string } {
  let current = min;
  let held = false;
  let heldBy: string | undefined = undefined;

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (const c of closures) {
      if (c.airport === airportId && current >= c.start_min && current < c.end_min) {
        current = c.end_min;
        held = true;
        heldBy = c.airport;
        changed = true;
      }
    }
  }

  return { resolvedMin: current, held, heldBy };
}

/**
 * Executes one deterministic forward pass over sorted flights
 */
export function runSinglePass(
  data: NetworkData,
  closures: AirportClosure[],
  options: SinglePassOptions = {}
): Record<string, FlightResult> {
  const cancelledFlightIds = options.cancelledFlightIds ?? new Set<string>();
  const flightOverrides = options.flightOverrides ?? new Map<string, Partial<Flight>>();
  const settings = options.settings ?? {};
  const capacityBacklog = !!settings.capacityBacklog;
  const minTurnaround = data.meta?.min_turnaround_minutes ?? 30;

  // Build capacity map
  const capacityMap = new Map<string, number>();
  for (const ap of data.airports || []) {
    capacityMap.set(ap.id, ap.capacity_per_hour || 10);
  }

  // Clone flights and apply overrides (e.g. spare swaps)
  const flights: Flight[] = (data.flights || []).map((f) => {
    const override = flightOverrides.get(f.flight_id);
    return override ? { ...f, ...override } : { ...f };
  });

  // Sort flights by scheduled departure (ties by flight_id)
  flights.sort((a, b) => {
    const depA = parseHHMM(a.dep);
    const depB = parseHHMM(b.dep);
    if (depA !== depB) return depA - depB;
    return a.flight_id.localeCompare(b.flight_id);
  });

  const prevFlightByTail = new Map<string, FlightResult>();
  const lastDepartureTimeByAirport = new Map<string, number>();
  const flightResults: Record<string, FlightResult> = {};

  for (const flight of flights) {
    const plannedDepMin = parseHHMM(flight.dep);
    const plannedArrMin = parseHHMM(flight.arr);
    const isCancelled = cancelledFlightIds.has(flight.flight_id);

    if (isCancelled) {
      flightResults[flight.flight_id] = {
        flight_id: flight.flight_id,
        tail_id: flight.tail_id,
        leg_order: flight.leg_order,
        origin: flight.origin,
        destination: flight.destination,
        planned_dep: flight.dep,
        planned_arr: flight.arr,
        planned_dep_min: plannedDepMin,
        planned_arr_min: plannedArrMin,
        actual_dep: flight.dep,
        actual_arr: flight.arr,
        actual_dep_min: plannedDepMin,
        actual_arr_min: plannedArrMin,
        delay_minutes: 0,
        status: 'cancelled',
        cause: 'crew_limit',
        caused_by: undefined,
        pax: flight.pax,
        is_cancelled: true,
        cancellation_reason: 'Crew duty limit exceeded or cancelled for recovery',
      };
      // Cancelled flight frees aircraft, so it is not set as prevFlightByTail
      continue;
    }

    // Step 1: earliest_dep = max(scheduled_dep, prev_flight.actual_arr + min_turnaround)
    let earliestDep = plannedDepMin;
    let dominantCause: DelayCause = 'none';
    let causedBy: string | undefined = undefined;

    const prevFlight = prevFlightByTail.get(flight.tail_id);
    if (prevFlight && !prevFlight.is_cancelled) {
      const turnaroundDep = prevFlight.actual_arr_min + minTurnaround;
      if (turnaroundDep > earliestDep) {
        earliestDep = turnaroundDep;
        dominantCause = 'aircraft_knock_on';
        causedBy = prevFlight.flight_id;
      }
    }

    // Step 2: Check origin closure
    let dep = earliestDep;
    const originClosure = resolveClosure(flight.origin, earliestDep, closures);
    if (originClosure.held) {
      dep = originClosure.resolvedMin;
      dominantCause = 'closure_hold';
      causedBy = flight.origin;
    }

    // Step 5: Capacity backlog throttling if enabled and flight was held
    if (capacityBacklog && originClosure.held) {
      const airportCapacity = capacityMap.get(flight.origin) || 10;
      const minSpacing = 60 / airportCapacity;
      const lastDep = lastDepartureTimeByAirport.get(flight.origin);
      if (lastDep !== undefined && lastDep >= dep) {
        dep = lastDep + minSpacing;
      }
    }
    lastDepartureTimeByAirport.set(flight.origin, dep);

    // Step 3: actual_arr = dep + block_minutes; check destination closure
    let actualArr = dep + flight.block_minutes;
    const destClosure = resolveClosure(flight.destination, actualArr, closures);
    if (destClosure.held) {
      actualArr = destClosure.resolvedMin;
      if (dominantCause === 'none') {
        dominantCause = 'closure_hold';
        causedBy = flight.destination;
      }
    }

    // Step 4: Calculate delay and status
    const depDelay = Math.max(0, dep - plannedDepMin);
    const arrDelay = Math.max(0, actualArr - plannedArrMin);
    const totalDelay = Math.max(depDelay, arrDelay);

    let status: FlightResult['status'] = 'ontime';
    if (totalDelay > 30) {
      status = 'delayed_major';
    } else if (totalDelay > 0) {
      status = 'delayed_minor';
    } else {
      dominantCause = 'none';
      causedBy = undefined;
    }

    const result: FlightResult = {
      flight_id: flight.flight_id,
      tail_id: flight.tail_id,
      leg_order: flight.leg_order,
      origin: flight.origin,
      destination: flight.destination,
      planned_dep: flight.dep,
      planned_arr: flight.arr,
      planned_dep_min: plannedDepMin,
      planned_arr_min: plannedArrMin,
      actual_dep: formatHHMM(dep),
      actual_arr: formatHHMM(actualArr),
      actual_dep_min: dep,
      actual_arr_min: actualArr,
      delay_minutes: totalDelay,
      status,
      cause: dominantCause,
      caused_by: causedBy,
      pax: flight.pax,
      is_cancelled: false,
    };

    flightResults[flight.flight_id] = result;
    prevFlightByTail.set(flight.tail_id, result);
  }

  return flightResults;
}

/**
 * Runs full simulation including iterative crew duty checks (up to 5 rounds)
 */
export function runSimulation(
  data: NetworkData,
  closures: AirportClosure[],
  options: {
    settings?: Partial<EngineSettings>;
    flightOverrides?: Map<string, Partial<Flight>>;
    forcedCancellations?: Set<string>;
  } = {}
): ResultJSON {
  const cancelledFlightIds = new Set<string>(options.forcedCancellations || []);
  const settings = options.settings;
  const flightOverrides = options.flightOverrides;

  let flights: Record<string, FlightResult> = {};
  let crewEval: ReturnType<typeof evaluateCrewDuty> | null = null;

  // Maximum 5 rounds of crew duty convergence
  for (let round = 0; round < 5; round++) {
    flights = runSinglePass(data, closures, {
      cancelledFlightIds,
      flightOverrides,
      settings,
    });

    crewEval = evaluateCrewDuty(data.crews || [], flights);

    if (crewEval.timedOutFlightIds.length === 0) {
      // Converged!
      break;
    }

    let newlyCancelled = 0;
    for (const fId of crewEval.timedOutFlightIds) {
      if (!cancelledFlightIds.has(fId)) {
        cancelledFlightIds.add(fId);
        newlyCancelled++;
      }
    }

    if (newlyCancelled === 0) {
      break;
    }
  }

  // Ensure crew duty is evaluated on final state
  crewEval = evaluateCrewDuty(data.crews || [], flights);

  // Evaluate connections
  const connEval = evaluateConnections(data.connections || [], flights);

  // Calculate KPIs
  let delayedFlights = 0;
  let cancelledFlights = 0;
  let totalDelayMinutes = 0;
  let strandedPaxCancelled = 0;
  const delayByCause = {
    closure_hold: 0,
    aircraft_knock_on: 0,
    crew_limit: 0,
    none: 0,
  };

  // Airport Impact aggregates
  const airportImpactMap = new Map<string, AirportImpact>();
  for (const ap of data.airports || []) {
    airportImpactMap.set(ap.id, {
      airport_id: ap.id,
      name: ap.name,
      city: ap.city,
      tier: ap.tier,
      flights_affected: 0,
      total_delay_minutes: 0,
      departures_delayed: 0,
      arrivals_delayed: 0,
      cancellations: 0,
      stranded_pax: 0,
    });
  }

  for (const f of Object.values(flights)) {
    if (f.is_cancelled) {
      cancelledFlights++;
      strandedPaxCancelled += f.pax;
      delayByCause.crew_limit += f.delay_minutes;

      const originImpact = airportImpactMap.get(f.origin);
      if (originImpact) {
        originImpact.cancellations++;
        originImpact.flights_affected++;
        originImpact.stranded_pax += f.pax;
      }
    } else {
      if (f.delay_minutes > 0) {
        delayedFlights++;
        totalDelayMinutes += f.delay_minutes;

        if (f.cause === 'closure_hold') delayByCause.closure_hold += f.delay_minutes;
        else if (f.cause === 'aircraft_knock_on') delayByCause.aircraft_knock_on += f.delay_minutes;
        else delayByCause.none += f.delay_minutes;

        const originImpact = airportImpactMap.get(f.origin);
        if (originImpact) {
          originImpact.departures_delayed++;
          originImpact.total_delay_minutes += f.delay_minutes;
          originImpact.flights_affected++;
        }

        const destImpact = airportImpactMap.get(f.destination);
        if (destImpact) {
          destImpact.arrivals_delayed++;
          destImpact.total_delay_minutes += f.delay_minutes;
          destImpact.flights_affected++;
        }
      }
    }
  }

  // Add missed connection passengers to airport impact
  for (const conn of Object.values(connEval.connections)) {
    if (conn.is_missed && conn.missed_reason === 'insufficient_turnaround') {
      const apImpact = airportImpactMap.get(conn.airport);
      if (apImpact) {
        apImpact.stranded_pax += conn.passengers;
      }
    }
  }

  const kpis: SimulationKPIs = {
    delayed_flights: delayedFlights,
    cancelled_flights: cancelledFlights,
    total_delay_minutes: totalDelayMinutes,
    stranded_pax_total: strandedPaxCancelled + connEval.missedPassengersTotal,
    stranded_pax_missed_connections: connEval.missedPassengersTotal,
    stranded_pax_cancelled_flights: strandedPaxCancelled,
    crews_at_risk: crewEval.crewsAtRiskCount,
    crews_timed_out: crewEval.crewsTimedOutCount,
    delay_by_cause: delayByCause,
  };

  const airportImpacts: Record<string, AirportImpact> = {};
  for (const [id, impact] of airportImpactMap.entries()) {
    airportImpacts[id] = impact;
  }

  return {
    flights,
    airports: airportImpacts,
    connections: connEval.connections,
    crews: crewEval.crews,
    kpis,
    closures,
  };
}
