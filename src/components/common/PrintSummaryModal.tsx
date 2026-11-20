import React from 'react';
import { X, Printer, Plane } from 'lucide-react';
import { ResultJSON, RecoveryAction } from '../../types/engine';
import { formatHHMM } from '../../utils/time';

interface PrintSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioName: string;
  disruptedResult: ResultJSON;
  recoveredResult?: ResultJSON;
  appliedAction?: RecoveryAction;
}

export const PrintSummaryModal: React.FC<PrintSummaryModalProps> = ({
  isOpen,
  onClose,
  scenarioName,
  disruptedResult,
  recoveredResult,
  appliedAction,
}) => {
  if (!isOpen) return null;

  const dKpis = disruptedResult.kpis;
  const rKpis = recoveredResult?.kpis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="cr-card w-full max-w-3xl max-h-[90vh] bg-white shadow-2xl flex flex-col p-6 overflow-y-auto animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="print-summary-title"
      >
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-status-closure" />
            <h2 id="print-summary-title" className="text-base font-bold text-ink">
              Executive Incident & Recovery Briefing
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-status-closure hover:bg-violet-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-6 font-sans text-ink">
          {/* Header */}
          <div className="border-b-2 border-ink pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-ink transform -rotate-45" />
                <h1 className="text-xl font-black tracking-tight text-ink uppercase">
                  Domino Sky Dispatcher Briefing
                </h1>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Deterministic Cascade Simulation & Optimization Report
              </p>
            </div>
            <div className="text-right font-mono text-xs text-ink-muted">
              <div>Date: Operating Day IST</div>
              <div className="font-bold text-ink">Scenario: {scenarioName}</div>
            </div>
          </div>

          {/* Active Disruption Windows */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
              1. Ground Stop & Closure Events
            </h3>
            {disruptedResult.closures.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {disruptedResult.closures.map((c) => (
                  <div key={c.id} className="p-2.5 rounded border border-border bg-slate-50 font-mono text-xs">
                    <div className="font-bold text-status-closure">{c.airport} Airfield Closed</div>
                    <div className="text-ink-muted text-[11px]">
                      {formatHHMM(c.start_min)} to {formatHHMM(c.end_min)} IST ({c.end_min - c.start_min} min)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-ink-muted">No airport closures active (Standard Schedule).</p>
            )}
          </div>

          {/* KPI Comparison Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
              2. Disruption vs. Recovery Operational Impact
            </h3>
            <table className="w-full text-left text-xs border border-border">
              <thead className="bg-slate-100 font-bold text-ink border-b border-border uppercase text-[10px]">
                <tr>
                  <th className="p-2">Metric</th>
                  <th className="p-2 text-right">Disrupted</th>
                  <th className="p-2 text-right">Recovered</th>
                  <th className="p-2 text-right">Net Recovery Benefit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                <tr>
                  <td className="p-2 font-sans font-medium">Stranded Passengers (Total)</td>
                  <td className="p-2 text-right font-bold">{dKpis.stranded_pax_total}</td>
                  <td className="p-2 text-right font-bold text-status-recovered">{rKpis ? rKpis.stranded_pax_total : 'N/A'}</td>
                  <td className="p-2 text-right text-emerald-700 font-bold">
                    {rKpis ? `-${dKpis.stranded_pax_total - rKpis.stranded_pax_total} pax` : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium">Total Delay Minutes</td>
                  <td className="p-2 text-right font-bold">{dKpis.total_delay_minutes}m</td>
                  <td className="p-2 text-right font-bold text-status-recovered">{rKpis ? `${rKpis.total_delay_minutes}m` : 'N/A'}</td>
                  <td className="p-2 text-right text-emerald-700 font-bold">
                    {rKpis ? `-${dKpis.total_delay_minutes - rKpis.total_delay_minutes}m` : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium">Delayed Flights</td>
                  <td className="p-2 text-right font-bold">{dKpis.delayed_flights}</td>
                  <td className="p-2 text-right font-bold text-status-recovered">{rKpis ? rKpis.delayed_flights : 'N/A'}</td>
                  <td className="p-2 text-right text-emerald-700 font-bold">
                    {rKpis ? `-${dKpis.delayed_flights - rKpis.delayed_flights}` : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium">Cancelled Flights</td>
                  <td className="p-2 text-right font-bold">{dKpis.cancelled_flights}</td>
                  <td className="p-2 text-right font-bold text-status-recovered">{rKpis ? rKpis.cancelled_flights : 'N/A'}</td>
                  <td className="p-2 text-right font-bold">
                    {rKpis ? (rKpis.cancelled_flights > dKpis.cancelled_flights ? `+${rKpis.cancelled_flights - dKpis.cancelled_flights} planned` : '0') : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Chosen Action Plan */}
          {appliedAction && (
            <div className="p-3 border border-status-recovered rounded-lg bg-teal-50/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-status-recovered mb-1">
                3. Executed Dispatch Action Plan
              </h3>
              <div className="text-xs font-bold text-ink">{appliedAction.title}</div>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">{appliedAction.description}</p>
            </div>
          )}

          {/* Root Cause Delay Budget */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
              4. Delay Root Cause Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-50 border border-border rounded">
                <span className="text-ink-muted block text-[10px] font-sans">Airport Ground Holds</span>
                <span className="font-bold text-status-closure">{dKpis.delay_by_cause.closure_hold} min</span>
              </div>
              <div className="p-2 bg-slate-50 border border-border rounded">
                <span className="text-ink-muted block text-[10px] font-sans">Turnaround Knock-On</span>
                <span className="font-bold text-status-minor">{dKpis.delay_by_cause.aircraft_knock_on} min</span>
              </div>
              <div className="p-2 bg-slate-50 border border-border rounded">
                <span className="text-ink-muted block text-[10px] font-sans">Crew Duty Exceeded</span>
                <span className="font-bold text-status-major">{dKpis.delay_by_cause.crew_limit} min</span>
              </div>
            </div>
          </div>

          {/* Signoff Footer */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-ink-muted font-mono">
            <div>Authorized Network Dispatcher ID: DS-OPS-CTRL</div>
            <div>Generated by Domino Sky Engine (Deterministic)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
