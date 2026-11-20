import { describe, it, expect } from 'vitest';
import rawData from '../data/flight_network.json';
import { NetworkData } from '../src/types/network';
import { runSimulation } from '../src/engine/simulator';
import { enumerateRecoveryActions } from '../src/engine/recoveryEnumerator';
import {
  validateDispatcherResponse,
  DispatcherAiResponse,
} from '../server/validator';
import { AirportClosure } from '../src/types/engine';

const data = rawData as NetworkData;

describe('AI Number & Option Validator', () => {
  const closures: AirportClosure[] = [
    { id: 'bom_closure', airport: 'BOM', start_min: 840, end_min: 930 }, // 14:00 - 15:30
  ];

  const baseResult = runSimulation(data, closures);
  const { top3 } = enumerateRecoveryActions(data, closures, baseResult);

  it('(a) validates matching response with legitimate engine numbers', () => {
    const kpis = baseResult.kpis;
    const best = top3[0];

    const validResponse: DispatcherAiResponse = {
      summary: `There are ${kpis.delayed_flights} delayed flights with ${kpis.stranded_pax_total} stranded passengers.`,
      options: [
        {
          id: best.action.id,
          rationale: `Applying this option reduces stranded passengers from ${best.before_kpis.stranded_pax_total} to ${best.after_kpis.stranded_pax_total}.`,
        },
      ],
      caveats: `Review carefully for ground coordination at ${best.before_kpis.total_delay_minutes} minutes of delay.`,
    };

    const report = validateDispatcherResponse(validResponse, baseResult, top3);
    expect(report.valid).toBe(true);
    expect(report.unmatchedNumbers).toEqual([]);
    expect(report.invalidOptionIds).toEqual([]);
  });

  it('(b) rejects an invented number (hallucination)', () => {
    const best = top3[0];
    const invalidResponse: DispatcherAiResponse = {
      summary: `There are 999999 delayed flights across India.`, // 999999 is definitely not in the data
      options: [
        {
          id: best.action.id,
          rationale: `Reduces delay by 88888 minutes.`, // 88888 not in data
        },
      ],
      caveats: `Ground conditions normal.`,
    };

    const report = validateDispatcherResponse(invalidResponse, baseResult, top3);
    expect(report.valid).toBe(false);
    expect(report.unmatchedNumbers).toContain('999999');
    expect(report.unmatchedNumbers).toContain('88888');
  });

  it('(c) accepts numbers formatted differently (e.g. 1,240 vs 1240)', () => {
    const best = top3[0];
    // Pick an existing number, format with comma
    const existingNum = best.before_kpis.total_delay_minutes;
    const formattedWithComma = existingNum.toLocaleString();

    const responseWithFormatting: DispatcherAiResponse = {
      summary: `Total disruption delay reached ${formattedWithComma} minutes.`,
      options: [
        {
          id: best.action.id,
          rationale: `Reduces stranded passengers from ${best.before_kpis.stranded_pax_total} to ${best.after_kpis.stranded_pax_total}.`,
        },
      ],
      caveats: `Operations update at 14:00.`,
    };

    const report = validateDispatcherResponse(responseWithFormatting, baseResult, top3);
    expect(report.valid).toBe(true);
    expect(report.unmatchedNumbers).toEqual([]);
  });

  it('(d) rejects unknown or fabricated option ID', () => {
    const kpis = baseResult.kpis;
    const responseWithBadId: DispatcherAiResponse = {
      summary: `There are ${kpis.delayed_flights} delayed flights.`,
      options: [
        {
          id: 'fake_option_swap_mars_aircraft_99',
          rationale: `This is a completely unknown option.`,
        },
      ],
      caveats: `None.`,
    };

    const report = validateDispatcherResponse(responseWithBadId, baseResult, top3);
    expect(report.valid).toBe(false);
    expect(report.invalidOptionIds).toContain('fake_option_swap_mars_aircraft_99');
  });
});
