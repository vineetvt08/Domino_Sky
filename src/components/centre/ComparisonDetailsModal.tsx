import React from 'react';
import { X, GitCompare, ArrowRight } from 'lucide-react';
import { ResultJSON, RecoveryAction, FlightResult } from '../../types/engine';

interface ComparisonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  disruptedResult: ResultJSON;
  recoveredResult: ResultJSON;
  appliedAction?: RecoveryAction;
}

export const ComparisonDetailsModal: React.FC<ComparisonDetailsModalProps> = ({
  isOpen,
  onClose,
  disruptedResult,
  recoveredResult,
  appliedAction,
}) => {
  if (!isOpen) return null;

  const beforeKpis = disruptedResult.kpis;
  const afterKpis = recoveredResult.kpis;

  const paxSaved = beforeKpis.stranded_pax_total - afterKpis.stranded_pax_total;
  const delaySaved = beforeKpis.total_delay_minutes - afterKpis.total_delay_minutes;
  const cancDiff = afterKpis.cancelled_flights - beforeKpis.cancelled_flights;

  // Find all flights that changed between disrupted and recovered
  const changedFlights = Object.keys(disruptedResult.flights)
    .map((fId) => {
      const b = disruptedResult.flights[fId];
      const a = recoveredResult.flights[fId];
      if (!b || !a) return null;
      const isChanged =
        b.actual_dep !== a.actual_dep ||
        b.actual_arr !== a.actual_arr ||
        b.is_cancelled !== a.is_cancelled ||
        b.tail_id !== a.tail_id;
      return isChanged ? { flightId: fId, before: b, after: a } : null;
    })
    .filter((item): item is { flightId: string; before: FlightResult; after: FlightResult } => item !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="cr-card w-full max-w-4xl max-h-[85vh] bg-white shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="comparison-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-status-recovered/10 text-status-recovered flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 id="comparison-title" className="text-base font-bold text-ink">
                Recovery Plan Impact Analysis: Before vs. After
              </h2>
              <p className="text-xs text-ink-muted">
                {appliedAction?.title || 'Recovery Simulation Plan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Comparison Metric Cards */}
        <div className="grid grid-cols-3 gap-3 py-4 shrink-0">
          <div className="p-3 bg-slate-50 border border-border rounded-lg text-center font-mono">
            <span className="text-[10px] uppercase font-sans text-ink-muted font-bold block mb-1">
              Stranded Passengers
            </span>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-ink">
              <span>{beforeKpis.stranded_pax_total}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-status-recovered font-black">{afterKpis.stranded_pax_total}</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
              {paxSaved > 0 ? `Saved ${paxSaved} passengers` : 'Unchanged'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-border rounded-lg text-center font-mono">
            <span className="text-[10px] uppercase font-sans text-ink-muted font-bold block mb-1">
              Total Delay Minutes
            </span>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-ink">
              <span>{beforeKpis.total_delay_minutes}m</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-status-recovered font-black">{afterKpis.total_delay_minutes}m</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
              {delaySaved > 0 ? `Reduced by ${delaySaved} min` : 'Unchanged'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-border rounded-lg text-center font-mono">
            <span className="text-[10px] uppercase font-sans text-ink-muted font-bold block mb-1">
              Cancelled Flights
            </span>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-ink">
              <span>{beforeKpis.cancelled_flights}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-status-recovered font-black">{afterKpis.cancelled_flights}</span>
            </div>
            <div className="text-[10px] text-ink-muted mt-1">
              {cancDiff > 0 ? `+${cancDiff} planned sacrifice` : 'Same cancellations'}
            </div>
          </div>
        </div>

        {/* Detailed Flights Diff Table */}
        <div className="flex-1 overflow-y-auto border border-border rounded-lg">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-ink-muted sticky top-0 border-b border-border z-10">
              <tr>
                <th className="p-2.5">Flight</th>
                <th className="p-2.5">Route</th>
                <th className="p-2.5">Tail</th>
                <th className="p-2.5">Before (Disrupted)</th>
                <th className="p-2.5">After (Recovered)</th>
                <th className="p-2.5 text-right">Net Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {changedFlights.map(({ flightId, before, after }) => {
                const delayDiff = after.delay_minutes - before.delay_minutes;

                return (
                  <tr key={flightId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold text-ink">{flightId}</td>
                    <td className="p-2.5 text-ink-muted">
                      {before.origin} ➔ {before.destination}
                    </td>
                    <td className="p-2.5">
                      {before.tail_id !== after.tail_id ? (
                        <div className="flex items-center gap-1">
                          <span className="line-through text-slate-400">{before.tail_id}</span>
                          <ArrowRight className="w-3 h-3 text-status-recovered" />
                          <span className="font-bold text-status-recovered">{after.tail_id}</span>
                        </div>
                      ) : (
                        <span>{before.tail_id}</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      {before.is_cancelled ? (
                        <span className="text-red-700 font-bold">Cancelled</span>
                      ) : (
                        <span>
                          {before.actual_dep} (+{before.delay_minutes}m)
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      {after.is_cancelled ? (
                        <span className="text-red-700 font-bold">Cancelled</span>
                      ) : (
                        <span className="text-status-recovered font-bold">
                          {after.actual_dep} (+{after.delay_minutes}m)
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-bold tabular-nums">
                      {delayDiff < 0 ? (
                        <span className="text-emerald-700">{delayDiff}m delay</span>
                      ) : delayDiff > 0 ? (
                        <span className="text-red-700">+{delayDiff}m delay</span>
                      ) : (
                        <span className="text-slate-400">Times shifted</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ink hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
