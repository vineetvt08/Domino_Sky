import { describe, it, expect } from 'vitest';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';
import { runSimulation, resolveClosure } from '../src/engine/simulator';
import { AirportClosure } from '../src/types/engine';
import { evaluateCrewDuty } from '../src/engine/crewDuty';

const data = rawData as NetworkData;

describe('Edge Cases & Boundary Conditions', () => {
  it('handles closure at day boundary start (00:00 - 01:30)', () => {
    const closures: AirportClosure[] = [
      { id: 'start_of_day_closure', airport: 'DEL', start_min: 0, end_min: 90 },
    ];

    const result = runSimulation(data, closures);
    expect(result).toBeDefined();
    // Flights departing DEL before 01:30 must be held until 01:30 or later
    for (const flight of Object.values(result.flights)) {
      if (flight.origin === 'DEL' && flight.planned_dep_min < 90 && !flight.is_cancelled) {
        expect(flight.actual_dep_min).toBeGreaterThanOrEqual(90);
        expect(flight.delay_minutes).toBeGreaterThan(0);
      }
    }
  });

  it('handles closure at day boundary end (22:30 - 24:00)', () => {
    const closures: AirportClosure[] = [
      { id: 'end_of_day_closure', airport: 'BOM', start_min: 1350, end_min: 1440 },
    ];

    const result = runSimulation(data, closures);
    expect(result).toBeDefined();
    // Inbound flights arriving BOM between 22:30 and 24:00 are held
    for (const flight of Object.values(result.flights)) {
      if (
        flight.destination === 'BOM' &&
        flight.planned_arr_min >= 1350 &&
        flight.planned_arr_min < 1440 &&
        !flight.is_cancelled
      ) {
        expect(flight.actual_arr_min).toBe(1440);
        expect(flight.delay_minutes).toBeGreaterThan(0);
      }
    }
  });

  it('handles closure at an airport with no operations in that window without errors', () => {
    // SXR (Srinagar) has only 2 flights during the day
    // Close SXR in late evening (22:00 - 23:30) when no flights operate
    const closures: AirportClosure[] = [
      { id: 'sxr_quiet_closure', airport: 'SXR', start_min: 1320, end_min: 1410 },
    ];

    const result = runSimulation(data, closures);
    expect(result).toBeDefined();
    expect(result.kpis.total_delay_minutes).toBe(0);
    expect(result.kpis.delayed_flights).toBe(0);
    expect(result.kpis.cancelled_flights).toBe(0);
    expect(result.kpis.stranded_pax_total).toBe(0);
  });

  it('handles maximum allowed 3 simultaneous closures across major hubs', () => {
    const closures: AirportClosure[] = [
      { id: 'del_closure', airport: 'DEL', start_min: 360, end_min: 450 }, // 06:00 - 07:30
      { id: 'bom_closure', airport: 'BOM', start_min: 420, end_min: 510 }, // 07:00 - 08:30
      { id: 'blr_closure', airport: 'BLR', start_min: 480, end_min: 570 }, // 08:00 - 09:30
    ];

    const result = runSimulation(data, closures);
    expect(result.kpis.delayed_flights).toBeGreaterThan(10);
    expect(result.kpis.total_delay_minutes).toBeGreaterThan(500);
    expect(result.kpis.stranded_pax_total).toBeGreaterThan(0);
  });

  it('evaluates crew duty exactly at 600m boundary: 600m is legal, 601m times out', () => {
    // Test synthetic crew with flight arriving at exactly 600m duty
    const syntheticFlight = {
      flight_id: 'TEST01',
      tail_id: 'VT-TEST',
      leg_order: 1,
      origin: 'DEL',
      destination: 'BOM',
      planned_dep: '06:00',
      planned_arr: '16:00',
      planned_dep_min: 360,
      planned_arr_min: 960,
      actual_dep: '06:00',
      actual_arr: '16:00',
      actual_dep_min: 360,
      actual_arr_min: 960, // 960 - 360 = 600 mins exactly
      block_minutes: 600,
      delay_minutes: 0,
      is_cancelled: false,
      status: 'ontime' as const,
      cause: 'none' as const,
      pax: 150,
    };

    const crewLegal = [
      {
        crew_id: 'CR-TEST',
        tail_id: 'VT-TEST',
        base: 'DEL',
        duty_start: '06:00',
        max_duty_mins: 600,
        flight_ids: ['TEST01'],
      },
    ];

    const evalLegal = evaluateCrewDuty(crewLegal, { TEST01: syntheticFlight });
    expect(evalLegal.timedOutFlightIds).toHaveLength(0);
    expect(evalLegal.crews['CR-TEST']?.duty_used_mins).toBe(600);
    expect(evalLegal.crews['CR-TEST']?.is_timed_out).toBe(false);

    // Now push arrival to 601m (actual_arr_min = 961)
    const syntheticFlightTimeout = {
      ...syntheticFlight,
      actual_arr_min: 961,
      actual_arr: '16:01',
    };

    const evalTimeout = evaluateCrewDuty(crewLegal, { TEST01: syntheticFlightTimeout });
    expect(evalTimeout.timedOutFlightIds).toContain('TEST01');
    expect(evalTimeout.crews['CR-TEST']?.is_timed_out).toBe(true);
    expect(evalTimeout.crewsTimedOutCount).toBe(1);
  });

  it('resolves stacked and contiguous closures correctly without infinite loop', () => {
    const closures: AirportClosure[] = [
      { id: 'c1', airport: 'BOM', start_min: 500, end_min: 600 },
      { id: 'c2', airport: 'BOM', start_min: 600, end_min: 700 }, // contiguous
    ];

    const resolved = resolveClosure('BOM', 550, closures);
    expect(resolved.held).toBe(true);
    expect(resolved.resolvedMin).toBe(700);
  });
});
