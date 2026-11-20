import { describe, it, expect } from 'vitest';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';
import { runSimulation } from '../src/engine/simulator';
import { enumerateRecoveryActions } from '../src/engine/recoveryEnumerator';
import { AirportClosure } from '../src/types/engine';

const data = rawData as NetworkData;

describe('Engine Efficiency & Performance Benchmarks', () => {
  it('executes a full-day multi-closure simulation pass in under 10ms', () => {
    const closures: AirportClosure[] = [
      { id: 'del_fog', airport: 'DEL', start_min: 360, end_min: 540 },
      { id: 'bom_closure', airport: 'BOM', start_min: 840, end_min: 930 },
      { id: 'blr_closure', airport: 'BLR', start_min: 600, end_min: 720 },
    ];

    // Warmup
    runSimulation(data, closures);

    // Measure 10 runs
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      runSimulation(data, closures);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 10;

    // Average per simulation must be well under 10ms (typically 0.5-2ms)
    expect(avgMs).toBeLessThan(10);
  });

  it('enumerates, simulates, and ranks all ~100 candidate recovery actions in under 100ms', () => {
    const closures: AirportClosure[] = [
      { id: 'bom_monsoon', airport: 'BOM', start_min: 840, end_min: 930 },
    ];

    const currentResult = runSimulation(data, closures);

    // Warmup
    enumerateRecoveryActions(data, closures, currentResult);

    // Measure 5 runs
    const start = performance.now();
    for (let i = 0; i < 5; i++) {
      enumerateRecoveryActions(data, closures, currentResult);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 5;

    // Must be well under 100ms (typically 20-50ms)
    expect(avgMs).toBeLessThan(100);
  });
});
