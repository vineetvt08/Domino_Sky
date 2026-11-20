import React from 'react';
import { SimulationKPIs } from '../../types/engine';

interface LiveAnnouncerProps {
  kpis: SimulationKPIs;
  closuresCount: number;
  lastClosureAirport?: string;
  isAiLoading: boolean;
}

/**
 * Visually hidden ARIA live region.
 * Emits screen reader polite notifications on KPI changes and dispatcher operations.
 */
export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({
  kpis,
  closuresCount,
  lastClosureAirport,
  isAiLoading,
}) => {
  const message = React.useMemo(() => {
    if (closuresCount === 0) {
      return 'Network operating on normal schedule. Zero active airport closures.';
    }
    if (isAiLoading) {
      return 'AI Dispatcher is calculating optimal recovery options...';
    }
    const closureText = lastClosureAirport ? `Airport ${lastClosureAirport} is closed. ` : '';
    return `${closureText}Disruption status: ${kpis.delayed_flights} flights delayed, ${kpis.cancelled_flights} flights cancelled, ${kpis.total_delay_minutes} total delay minutes, ${kpis.stranded_pax_total} stranded passengers.`;
  }, [kpis, closuresCount, lastClosureAirport, isAiLoading]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};
