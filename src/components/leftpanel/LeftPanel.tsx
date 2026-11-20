import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Airport } from '../../types/network';
import { AirportClosure, AirportImpact } from '../../types/engine';
import { ClosureCard } from './ClosureCard';
import { AirportTable } from './AirportTable';

interface LeftPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  airports: Airport[];
  closures: AirportClosure[];
  onAddClosure: (closure: AirportClosure) => void;
  onRemoveClosure: (id: string) => void;
  onUpdateClosure: (id: string, updates: Partial<AirportClosure>) => void;
  airportImpacts: Record<string, AirportImpact>;
  totalNetworkDelay: number;
  selectedAirportId?: string;
  onSelectAirport: (id: string) => void;
  onHoverAirport: (id: string | null) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  airports,
  closures,
  onAddClosure,
  onRemoveClosure,
  onUpdateClosure,
  airportImpacts,
  totalNetworkDelay,
  selectedAirportId,
  onSelectAirport,
  onHoverAirport,
}) => {
  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-r border-border flex flex-col items-center py-3 shrink-0 shadow-xs">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
          title="Expand left panel"
          aria-label="Expand left panel"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-8 transform -rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Closures & Airports
        </div>
      </div>
    );
  }

  return (
    <aside
      className="w-[300px] bg-slate-50 border-r border-border flex flex-col shrink-0 overflow-y-auto relative p-3 space-y-3 z-20"
      aria-label="Disruption controls"
    >
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Control Panel
        </span>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-ink-muted hover:text-ink rounded hover:bg-slate-200 transition-colors"
          title="Collapse panel"
          aria-label="Collapse panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <ClosureCard
        airports={airports}
        closures={closures}
        onAddClosure={onAddClosure}
        onRemoveClosure={onRemoveClosure}
        onUpdateClosure={onUpdateClosure}
        selectedAirportId={selectedAirportId}
      />

      <AirportTable
        airportImpacts={airportImpacts}
        totalNetworkDelay={totalNetworkDelay}
        selectedAirportId={selectedAirportId}
        onSelectAirport={onSelectAirport}
        onHoverAirport={onHoverAirport}
      />
    </aside>
  );
};
