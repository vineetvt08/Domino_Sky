import React, { useMemo } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { NetworkData } from '../../types/network';
import { simulateWeakestAirports } from '../../engine/weakestAirport';
import { AirportClosure } from '../../types/engine';

interface WeakestAirportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkData: NetworkData;
  onApplyClosure: (closure: AirportClosure) => void;
}

export const WeakestAirportsModal: React.FC<WeakestAirportsModalProps> = ({
  isOpen,
  onClose,
  networkData,
  onApplyClosure,
}) => {
  const rankedAirports = useMemo(() => {
    return simulateWeakestAirports(networkData, 600, 60); // 10:00 - 11:00 1-hour closure sensitivity test
  }, [networkData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="cr-card w-full max-w-3xl max-h-[85vh] bg-white shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="weakest-modal-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-status-major/10 text-status-major flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 id="weakest-modal-title" className="text-base font-bold text-ink">
                Network Vulnerability: Weakest Airports Analysis
              </h2>
              <p className="text-xs text-ink-muted">
                Sensitivity rank: standard 1-hour closure (10:00 - 11:00 IST) simulated across all 16 airports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
            aria-label="Close vulnerability analysis"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Ranked Table */}
        <div className="flex-1 overflow-y-auto my-4 border border-border rounded-lg">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-ink-muted sticky top-0 border-b border-border z-10">
              <tr>
                <th className="p-2.5 w-12 text-center">Rank</th>
                <th className="p-2.5">Airport</th>
                <th className="p-2.5">Tier</th>
                <th className="p-2.5 text-right">Stranded Pax</th>
                <th className="p-2.5 text-right">Total Delay</th>
                <th className="p-2.5 text-right">Delayed Flights</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rankedAirports.map((item) => (
                <tr key={item.airport_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 text-center">
                    <span
                      className={`inline-block w-5 h-5 rounded-full text-[10px] font-bold leading-5 ${
                        item.rank <= 3
                          ? 'bg-status-major text-white font-extrabold'
                          : 'bg-slate-100 text-ink-muted'
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className="p-2.5 font-bold text-ink">
                    <span className="text-sm">{item.airport_id}</span>
                    <span className="text-[11px] font-normal text-ink-muted ml-1.5 font-sans">
                      {item.city} ({item.name})
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500 capitalize font-sans text-[11px]">
                    {item.tier.replace('_', ' ')}
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-700 tabular-nums">
                    {item.stranded_pax_total}
                  </td>
                  <td className="p-2.5 text-right font-bold tabular-nums">
                    {item.total_delay_minutes > 0 ? (
                      <span className="text-status-major">+{item.total_delay_minutes}m</span>
                    ) : (
                      <span className="text-status-ontime">0m</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-ink">
                    {item.delayed_flights}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => {
                        onApplyClosure({
                          id: `closure_weakest_${item.airport_id}`,
                          airport: item.airport_id,
                          start_min: 600,
                          end_min: 660,
                        });
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-status-closure hover:text-white rounded text-[10px] font-bold transition-colors"
                    >
                      Simulate 1h
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-border flex justify-between items-center text-xs text-ink-muted">
          <span>Airports with high connecting banks (e.g. BOM, DEL, BLR) create exponential knock-on cascades.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ink hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
