import { NetworkData } from '../types/network';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNetworkData(data: NetworkData): ValidationResult {
  const errors: string[] = [];

  if (!data) {
    return { valid: false, errors: ['Network data is null or undefined'] };
  }

  // Validate airports
  if (!Array.isArray(data.airports) || data.airports.length === 0) {
    errors.push('Network data must contain a non-empty airports array');
  }

  const airportIds = new Set<string>();
  for (const airport of data.airports || []) {
    if (!airport.id) {
      errors.push(`Airport missing id: ${JSON.stringify(airport)}`);
    } else if (airportIds.has(airport.id)) {
      errors.push(`Duplicate airport id: ${airport.id}`);
    } else {
      airportIds.add(airport.id);
    }

    if (typeof airport.lat !== 'number' || typeof airport.lng !== 'number') {
      errors.push(`Airport ${airport.id} has invalid coordinates (lat: ${airport.lat}, lng: ${airport.lng})`);
    }
  }

  // Known tail ids from flights and spare aircraft
  const knownTails = new Set<string>();
  const spareTails = new Set<string>();
  for (const spare of data.spare_aircraft || []) {
    if (!spare.tail_id) {
      errors.push(`Spare aircraft missing tail_id`);
    } else {
      spareTails.add(spare.tail_id);
      knownTails.add(spare.tail_id);
    }
    if (!airportIds.has(spare.base)) {
      errors.push(`Spare aircraft ${spare.tail_id} base ${spare.base} not found in airports`);
    }
  }

  // Collect flight tails
  const flightIds = new Set<string>();
  const flightsByTail = new Map<string, typeof data.flights>();

  for (const flight of data.flights || []) {
    if (!flight.flight_id) {
      errors.push(`Flight missing flight_id`);
      continue;
    }
    if (flightIds.has(flight.flight_id)) {
      errors.push(`Duplicate flight_id: ${flight.flight_id}`);
    }
    flightIds.add(flight.flight_id);

    if (!flight.tail_id) {
      errors.push(`Flight ${flight.flight_id} missing tail_id`);
      continue;
    }
    knownTails.add(flight.tail_id);

    if (!airportIds.has(flight.origin)) {
      errors.push(`Flight ${flight.flight_id} origin ${flight.origin} not in airports`);
    }
    if (!airportIds.has(flight.destination)) {
      errors.push(`Flight ${flight.flight_id} destination ${flight.destination} not in airports`);
    }

    if (!flightsByTail.has(flight.tail_id)) {
      flightsByTail.set(flight.tail_id, []);
    }
    flightsByTail.get(flight.tail_id)!.push(flight);
  }

  // Validate leg_order is contiguous per tail (1, 2, 3...)
  for (const [tailId, flights] of flightsByTail.entries()) {
    flights.sort((a, b) => a.leg_order - b.leg_order);
    for (let i = 0; i < flights.length; i++) {
      const expectedLeg = i + 1;
      if (flights[i].leg_order !== expectedLeg) {
        errors.push(
          `Tail ${tailId} leg_order is not contiguous. Expected ${expectedLeg}, found ${flights[i].leg_order} on flight ${flights[i].flight_id}`
        );
      }
      // Check physical continuity: flight[i].destination == flight[i+1].origin
      if (i > 0) {
        const prev = flights[i - 1];
        const curr = flights[i];
        if (prev.destination !== curr.origin) {
          errors.push(
            `Tail ${tailId} airport discontinuity: ${prev.flight_id} arrives at ${prev.destination} but ${curr.flight_id} departs from ${curr.origin}`
          );
        }
      }
    }
  }

  // Validate connections
  for (const conn of data.connections || []) {
    if (!conn.connection_id) {
      errors.push(`Connection missing connection_id`);
    }
    if (!flightIds.has(conn.from_flight)) {
      errors.push(`Connection ${conn.connection_id} from_flight ${conn.from_flight} does not exist`);
    }
    if (!flightIds.has(conn.to_flight)) {
      errors.push(`Connection ${conn.connection_id} to_flight ${conn.to_flight} does not exist`);
    }
    if (!airportIds.has(conn.airport)) {
      errors.push(`Connection ${conn.connection_id} airport ${conn.airport} does not exist`);
    }
  }

  // Validate crews
  for (const crew of data.crews || []) {
    if (!crew.crew_id) {
      errors.push(`Crew missing crew_id`);
    }
    if (!knownTails.has(crew.tail_id)) {
      errors.push(`Crew ${crew.crew_id} assigned to unknown tail_id ${crew.tail_id}`);
    }
    for (const fId of crew.flight_ids || []) {
      if (!flightIds.has(fId)) {
        errors.push(`Crew ${crew.crew_id} flight ${fId} does not exist in flights`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
