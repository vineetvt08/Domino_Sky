import React from 'react';
import { DelayCause, SimulationKPIs } from '../../types/engine';

interface DelayRibbonProps {
  delayByCause: SimulationKPIs['delay_by_cause'];
  totalDelay: number;
  onFilterCause?: (cause: DelayCause) => void;
}

export const DelayRibbon: React.FC<DelayRibbonProps> = ({
  delayByCause,
  totalDelay,
}) => {
  const closureHoldMins = delayByCause.closure_hold || 0;
  const knockOnMins = delayByCause.aircraft_knock_on || 0;
  const crewLimitMins = delayByCause.crew_limit || 0;

  const validTotal = Math.max(1, totalDelay);

  const closurePct = Math.round((closureHoldMins / validTotal) * 100);
  const knockOnPct = Math.round((knockOnMins / validTotal) * 100);
  const crewLimitPct = Math.min(100 - closurePct - knockOnPct, Math.round((crewLimitMins / validTotal) * 100));

  return (
    <div className="cr-card p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
          Delay-Budget Breakdown by Root Cause
        </span>
        <span className="font-mono text-ink-muted text-[11px]">
          Total: <strong className="text-ink">{totalDelay} min</strong>
        </span>
      </div>

      {/* Segmented Progress Ribbon */}
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {closureHoldMins > 0 && (
          <div
            style={{ width: `${closurePct}%` }}
            className="bg-status-closure h-full transition-all"
            title={`Airport Closure Hold: ${closureHoldMins} min (${closurePct}%)`}
          />
        )}
        {knockOnMins > 0 && (
          <div
            style={{ width: `${knockOnPct}%` }}
            className="bg-status-minor h-full transition-all"
            title={`Aircraft Knock-on Cascade: ${knockOnMins} min (${knockOnPct}%)`}
          />
        )}
        {crewLimitMins > 0 && (
          <div
            style={{ width: `${crewLimitPct}%` }}
            className="bg-status-major h-full transition-all"
            title={`Crew Duty Timeout: ${crewLimitMins} min (${crewLimitPct}%)`}
          />
        )}
      </div>

      {/* Cause Badges */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-status-closure" />
          <span className="text-ink-muted">Closure Hold:</span>
          <span className="font-mono font-bold text-ink">
            {closureHoldMins}m ({totalDelay > 0 ? closurePct : 0}%)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-status-minor" />
          <span className="text-ink-muted">Aircraft Knock-on:</span>
          <span className="font-mono font-bold text-ink">
            {knockOnMins}m ({totalDelay > 0 ? knockOnPct : 0}%)
          </span>
        </div>

        {crewLimitMins > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-major" />
            <span className="text-ink-muted">Crew Limit:</span>
            <span className="font-mono font-bold text-ink">
              {crewLimitMins}m ({totalDelay > 0 ? crewLimitPct : 0}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
