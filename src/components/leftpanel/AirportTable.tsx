import React, { useState, useMemo } from 'react';
import { AirportImpact } from '../../types/engine';
import { ArrowUpDown } from 'lucide-react';

interface AirportTableProps {
  airportImpacts: Record<string, AirportImpact>;
  totalNetworkDelay: number;
  selectedAirportId?: string;
  onSelectAirport: (id: string) => void;
  onHoverAirport: (id: string | null) => void;
}

type SortField = 'id' | 'flights_affected' | 'total_delay_minutes' | 'stranded_pax';

export const AirportTable: React.FC<AirportTableProps> = ({
  airportImpacts,
  totalNetworkDelay,
  selectedAirportId,
  onSelectAirport,
  onHoverAirport,
}) => {
  const [sortField, setSortField] = useState<SortField>('total_delay_minutes');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedList = useMemo(() => {
    const list = Object.values(airportImpacts);
    return list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'id') diff = a.airport_id.localeCompare(b.airport_id);
      else if (sortField === 'flights_affected') diff = a.flights_affected - b.flights_affected;
      else if (sortField === 'total_delay_minutes') diff = a.total_delay_minutes - b.total_delay_minutes;
      else if (sortField === 'stranded_pax') diff = a.stranded_pax - b.stranded_pax;
      return sortAsc ? diff : -diff;
    });
  }, [airportImpacts, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc
    }
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'mega_hub') {
      return (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full border-2 border-status-closure"
          title="Mega Hub"
        />
      );
    }
    if (tier === 'regional_hub') {
      return (
        <span
          className="inline-block w-2 h-2 rounded-full bg-slate-400"
          title="Regional Hub"
        />
      );
    }
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"
        title="Spoke Airport"
      />
    );
  };

  return (
    <div className="cr-card p-3 space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
          Airport Network Impact
        </h3>
        <span className="text-[10px] text-ink-muted">
          16 airports
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" role="table" aria-label="Airport network impact table">
          <thead>
            <tr className="text-[10px] font-semibold text-ink-muted border-b border-border uppercase">
              <th
                onClick={() => toggleSort('id')}
                className="py-1.5 px-1 cursor-pointer hover:text-ink select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Code</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('flights_affected')}
                className="py-1.5 px-1 text-right cursor-pointer hover:text-ink select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Flights</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('total_delay_minutes')}
                className="py-1.5 px-1 text-right cursor-pointer hover:text-ink select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Delay</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th className="py-1.5 px-1 w-14 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedList.map((ap) => {
              const isSelected = selectedAirportId === ap.airport_id;
              const sharePercent =
                totalNetworkDelay > 0
                  ? Math.min(100, Math.round((ap.total_delay_minutes / totalNetworkDelay) * 100))
                  : 0;

              return (
                <tr
                  key={ap.airport_id}
                  onClick={() => onSelectAirport(ap.airport_id)}
                  onMouseEnter={() => onHoverAirport(ap.airport_id)}
                  onMouseLeave={() => onHoverAirport(null)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-status-closure/10 font-medium'
                      : 'hover:bg-slate-50'
                  }`}
                  aria-selected={isSelected}
                >
                  <td className="py-1.5 px-1 font-mono font-bold text-ink">
                    <div className="flex items-center gap-1.5">
                      {getTierIcon(ap.tier)}
                      <span>{ap.airport_id}</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-ink-muted tabular-nums">
                    {ap.flights_affected > 0 ? (
                      <span className={ap.flights_affected > 5 ? 'text-status-major font-semibold' : ''}>
                        {ap.flights_affected}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono tabular-nums">
                    {ap.total_delay_minutes > 0 ? (
                      <span
                        className={
                          ap.total_delay_minutes > 120
                            ? 'text-status-major font-bold'
                            : ap.total_delay_minutes > 30
                            ? 'text-status-minor font-medium'
                            : 'text-ink'
                        }
                      >
                        +{ap.total_delay_minutes}m
                      </span>
                    ) : (
                      <span className="text-status-ontime font-medium">0m</span>
                    )}
                  </td>
                  <td className="py-1.5 px-1 text-right">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sharePercent > 30 ? 'bg-status-major' : 'bg-status-minor'
                        }`}
                        style={{ width: `${sharePercent}%` }}
                        title={`${sharePercent}% of total network delay`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
