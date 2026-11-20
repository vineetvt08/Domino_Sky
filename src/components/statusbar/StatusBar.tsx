import React from 'react';
import { AirportClosure } from '../../types/engine';

interface StatusBarProps {
  closures: AirportClosure[];
  totalFlights: number;
  delayedCount: number;
  cancelledCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  closures,
  totalFlights,
  delayedCount,
  cancelledCount,
}) => {
  return (
    <footer className="h-7 bg-white border-t border-border px-3 flex items-center justify-between text-[11px] text-ink-muted shrink-0 select-none font-mono">
      {/* Left: Engine verification indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-status-ontime font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-status-ontime animate-pulse" />
          <span>Deterministic Engine Live</span>
        </div>
        <span className="text-slate-300">|</span>
        <span>
          {closures.length === 0
            ? 'Clear Skies (Zero closures)'
            : `${closures.length} active closure${closures.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Center: Live summary metrics */}
      <div className="hidden sm:flex items-center gap-3">
        <span>{totalFlights} flights tracked</span>
        <span className="text-slate-300">·</span>
        <span className={delayedCount > 0 ? 'text-status-minor font-semibold' : ''}>
          {delayedCount} delayed
        </span>
        <span className="text-slate-300">·</span>
        <span className={cancelledCount > 0 ? 'text-status-major font-semibold' : ''}>
          {cancelledCount} cancelled
        </span>
      </div>

      {/* Right: Keyboard shortcuts quick hint */}
      <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400">
        <span>[Space] Play</span>
        <span>[← / →] Step 15m</span>
        <span>[/] Search</span>
        <span>[Esc] Close</span>
      </div>
    </footer>
  );
};
