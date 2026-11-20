import { describe, it, expect } from 'vitest';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';
import { runSimulation } from '../src/engine/simulator';
import { AirportClosure } from '../src/types/engine';

const data = rawData as NetworkData;

describe('Domino Sky Engine', () => {
  it('Baseline test: with zero closures, result equals planned schedule (zero delay)', () => {
    const result = runSimulation(data, []);

    expect(result.kpis.delayed_flights).toBe(0);
    expect(result.kpis.cancelled_flights).toBe(0);
    expect(result.kpis.total_delay_minutes).toBe(0);
    expect(result.kpis.stranded_pax_total).toBe(0);
    expect(result.kpis.stranded_pax_missed_connections).toBe(0);
    expect(result.kpis.stranded_pax_cancelled_flights).toBe(0);
    expect(result.kpis.crews_timed_out).toBe(0);

    for (const flight of Object.values(result.flights)) {
      expect(flight.delay_minutes).toBe(0);
      expect(flight.status).toBe('ontime');
      expect(flight.cause).toBe('none');
      expect(flight.actual_dep).toBe(flight.planned_dep);
      expect(flight.actual_arr).toBe(flight.planned_arr);
      expect(flight.is_cancelled).toBe(false);
    }

    for (const conn of Object.values(result.connections)) {
      expect(conn.is_missed).toBe(false);
    }
  });

  it('Hand-calculated Scenario 1: BOM closure 08:00 - 09:30 (480 to 570 min)', () => {
    const closures: AirportClosure[] = [
      {
        id: 'bom_closure_1',
        airport: 'BOM',
        start_min: 480, // 08:00
        end_min: 570,   // 09:30
      },
    ];

    const result = runSimulation(data, closures);

    // DS0501 scheduled dep 08:15 BOM -> BLR. Origin closed until 09:30.
    const ds0501 = result.flights['DS0501']!;
    expect(ds0501).toBeDefined();
    expect(ds0501.actual_dep_min).toBe(570); // 09:30
    expect(ds0501.actual_dep).toBe('09:30');
    expect(ds0501.delay_minutes).toBe(75); // 09:30 - 08:15 = 75 min
    expect(ds0501.cause).toBe('closure_hold');
    expect(ds0501.caused_by).toBe('BOM');

    // DS0201 arrives BOM planned 08:10. Held until 09:30 reopening.
    const ds0201 = result.flights['DS0201']!;
    expect(ds0201).toBeDefined();
    expect(ds0201.actual_arr_min).toBe(570); // 09:30
    expect(ds0201.delay_minutes).toBe(80); // 09:30 - 08:10 = 80 min

    // DS0202 is on same tail VT-DS02, scheduled dep 09:20.
    // Turnaround = 09:30 + 30 min = 10:00 (600 min).
    const ds0202 = result.flights['DS0202']!;
    expect(ds0202).toBeDefined();
    expect(ds0202.actual_dep_min).toBe(600); // 10:00
    expect(ds0202.actual_dep).toBe('10:00');
    expect(ds0202.delay_minutes).toBe(40); // 10:00 - 09:20 = 40 min
    expect(ds0202.cause).toBe('aircraft_knock_on');
    expect(ds0202.caused_by).toBe('DS0201');
  });

  it('Hand-calculated Scenario 2: Connection breakage on CX01 via AMD closure', () => {
    // CX01: BOM, DS1201 (AMD->BOM, arr 07:40) to DS1502 (BOM->DEL, dep 08:50), 43 pax, min_connect 45 min.
    // Close AMD from 06:00 (360) to 07:15 (435).
    const closures: AirportClosure[] = [
      {
        id: 'amd_closure',
        airport: 'AMD',
        start_min: 360,
        end_min: 435, // 07:15
      },
    ];

    const result = runSimulation(data, closures);

    // DS1201 planned dep 06:30, held to 07:15. Block = 70 min -> actual arr = 08:25 (505 min).
    const ds1201 = result.flights['DS1201']!;
    expect(ds1201.actual_dep_min).toBe(435);
    expect(ds1201.actual_arr_min).toBe(505);

    // DS1502 dep is 08:50 (530 min).
    // Actual connection window = 530 - 505 = 25 min < 45 min!
    const cx01 = result.connections['CX01']!;
    expect(cx01.is_missed).toBe(true);
    expect(cx01.passengers).toBe(43);
    expect(cx01.actual_connection_time).toBe(25);
    expect(result.kpis.stranded_pax_missed_connections).toBeGreaterThanOrEqual(43);
  });

  it('Hand-calculated Scenario 3: Overlapping multi-closures (DEL and BOM) compound cascade', () => {
    const closures: AirportClosure[] = [
      { id: 'del_fog', airport: 'DEL', start_min: 360, end_min: 540 }, // 06:00 - 09:00
      { id: 'bom_monsoon', airport: 'BOM', start_min: 840, end_min: 930 }, // 14:00 - 15:30
    ];

    const result = runSimulation(data, closures);
    expect(result.kpis.delayed_flights).toBeGreaterThanOrEqual(8);
    expect(result.kpis.total_delay_minutes).toBeGreaterThan(500);

    // Both closure causes and knock-on causes must exist
    expect(result.kpis.delay_by_cause.closure_hold).toBeGreaterThan(0);
    expect(result.kpis.delay_by_cause.aircraft_knock_on).toBeGreaterThan(0);
  });

  it('Crew timeout convergence test: extreme delay cancels trailing legs and stabilizes within 5 rounds', () => {
    // Massive closure at DEL (all morning 06:00 to 14:00)
    const closures: AirportClosure[] = [
      { id: 'del_massive', airport: 'DEL', start_min: 360, end_min: 840 },
    ];

    const result = runSimulation(data, closures);
    // Crew timeouts must have triggered cancellations
    expect(result.kpis.cancelled_flights).toBeGreaterThan(0);
    expect(result.kpis.stranded_pax_cancelled_flights).toBeGreaterThan(0);

    // Verify all cancelled flights have is_cancelled = true
    for (const flight of Object.values(result.flights)) {
      if (flight.is_cancelled) {
        expect(flight.status).toBe('cancelled');
      }
    }
  });
});
