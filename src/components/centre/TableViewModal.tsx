import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { FlightResult } from '../../types/engine';

interface TableViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Record<string, FlightResult>;
  onSelectFlight: (id: string) => void;
}

export const TableViewModal: React.FC<TableViewModalProps> = ({
  isOpen,
  onClose,
  flights,
  onSelectFlight,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof FlightResult>('planned_dep_min');
  const [sortAsc, setSortAsc] = useState(true);

  const flightList = useMemo(() => {
    let list = Object.values(flights);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.flight_id.toLowerCase().includes(q) ||
          f.tail_id.toLowerCase().includes(q) ||
          f.origin.toLowerCase().includes(q) ||
          f.destination.toLowerCase().includes(q) ||
          f.cause.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [flights, search, sortField, sortAsc]);

  if (!isOpen) return null;

  const handleSort = (field: keyof FlightResult) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="cr-card w-full max-w-4xl max-h-[85vh] bg-white shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="table-view-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div>
            <h2 id="table-view-title" className="text-base font-bold text-ink">
              All Scheduled & Simulated Flights (Table View)
            </h2>
            <p className="text-xs text-ink-muted">
              Screen-reader accessible table of network operations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
            aria-label="Close table view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="py-3 flex items-center gap-2 shrink-0">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flight ID, tail, route, or cause..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:border-status-closure"
            />
          </div>
          <span className="text-xs text-ink-muted font-mono">
            {flightList.length} flights
          </span>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-y-auto border border-border rounded-lg">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-ink-muted sticky top-0 border-b border-border z-10">
              <tr>
                <th onClick={() => handleSort('flight_id')} className="p-2 cursor-pointer">
                  Flight ID
                </th>
                <th onClick={() => handleSort('tail_id')} className="p-2 cursor-pointer">
                  Tail
                </th>
                <th onClick={() => handleSort('origin')} className="p-2 cursor-pointer">
                  Route
                </th>
                <th onClick={() => handleSort('planned_dep_min')} className="p-2 cursor-pointer">
                  Planned
                </th>
                <th onClick={() => handleSort('actual_dep_min')} className="p-2 cursor-pointer">
                  Actual
                </th>
                <th onClick={() => handleSort('delay_minutes')} className="p-2 cursor-pointer text-right">
                  Delay
                </th>
                <th onClick={() => handleSort('status')} className="p-2 cursor-pointer">
                  Status
                </th>
                <th onClick={() => handleSort('cause')} className="p-2 cursor-pointer">
                  Root Cause
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flightList.map((f) => (
                <tr
                  key={f.flight_id}
                  onClick={() => {
                    onSelectFlight(f.flight_id);
                    onClose();
                  }}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  tabIndex={0}
                  aria-label={`Flight ${f.flight_id}, ${f.origin} to ${f.destination}, ${
                    f.is_cancelled ? 'cancelled' : `delayed ${f.delay_minutes} minutes`
                  }`}
                >
                  <td className="p-2 font-mono font-bold text-ink">{f.flight_id}</td>
                  <td className="p-2 font-mono text-ink-muted">{f.tail_id}</td>
                  <td className="p-2 font-semibold">
                    {f.origin} ➔ {f.destination}
                  </td>
                  <td className="p-2 font-mono text-slate-500">
                    {f.planned_dep} - {f.planned_arr}
                  </td>
                  <td className="p-2 font-mono font-medium text-ink">
                    {f.actual_dep} - {f.actual_arr}
                  </td>
                  <td className="p-2 font-mono font-bold text-right tabular-nums">
                    {f.is_cancelled ? (
                      <span className="text-slate-400">N/A</span>
                    ) : f.delay_minutes > 0 ? (
                      <span className="text-status-major">+{f.delay_minutes}m</span>
                    ) : (
                      <span className="text-status-ontime">0m</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.is_cancelled
                          ? 'bg-slate-200 text-slate-700'
                          : f.status === 'delayed_major'
                          ? 'bg-red-100 text-red-800'
                          : f.status === 'delayed_minor'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {f.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-[11px] text-ink-muted">
                    {f.cause}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
