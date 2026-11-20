import { describe, it, expect } from 'vitest';
import { validateNetworkData } from '../src/engine/validator';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';

describe('Network Data Validator', () => {
  it('validates the official flight_network.json successfully with zero errors', () => {
    const data = rawData as NetworkData;
    const result = validateNetworkData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('detects missing tail_id on a flight', () => {
    const data = JSON.parse(JSON.stringify(rawData)) as NetworkData;
    data.flights[0]!.tail_id = '';
    const result = validateNetworkData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('missing tail_id'))).toBe(true);
  });

  it('detects non-contiguous leg_order on a tail', () => {
    const data = JSON.parse(JSON.stringify(rawData)) as NetworkData;
    // Break leg order for VT-DS01
    const ds01Flights = data.flights.filter((f) => f.tail_id === 'VT-DS01');
    ds01Flights[1]!.leg_order = 5; // instead of 2
    const result = validateNetworkData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('leg_order is not contiguous'))).toBe(true);
  });

  it('detects airport physical discontinuity along a tail', () => {
    const data = JSON.parse(JSON.stringify(rawData)) as NetworkData;
    // DS0101 is DEL->JAI, DS0102 is JAI->DEL. Change DS0102 origin to BOM
    const flight = data.flights.find((f) => f.flight_id === 'DS0102');
    if (flight) flight.origin = 'BOM';
    const result = validateNetworkData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('airport discontinuity'))).toBe(true);
  });

  it('detects non-existent connection flight', () => {
    const data = JSON.parse(JSON.stringify(rawData)) as NetworkData;
    data.connections[0]!.to_flight = 'DS9999';
    const result = validateNetworkData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('does not exist'))).toBe(true);
  });
});
