import React from 'react';
import {
  Clock,
  Ban,
  Users,
  ShieldAlert,
  AlertTriangle,
  User,
} from 'lucide-react';
import { SimulationKPIs } from '../../types/engine';
import { AnimatedCounter } from '../common/AnimatedCounter';

export type KpiFilterType = 'all' | 'delayed' | 'cancelled' | 'stranded_conn' | 'crews_at_risk';

interface KpiStripProps {
  kpis: SimulationKPIs;
  baselineKpis?: SimulationKPIs;
  activeFilter: KpiFilterType;
  onSelectFilter: (filter: KpiFilterType) => void;
  reducedMotion?: boolean;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  kpis,
  baselineKpis,
  activeFilter,
  onSelectFilter,
  reducedMotion = false,
}) => {
  // Delays and deltas
  const delayedDelta = baselineKpis ? kpis.delayed_flights - baselineKpis.delayed_flights : 0;
  const cancelledDelta = baselineKpis ? kpis.cancelled_flights - baselineKpis.cancelled_flights : 0;
  const delayMinsDelta = baselineKpis ? kpis.total_delay_minutes - baselineKpis.total_delay_minutes : 0;
  const strandedDelta = baselineKpis ? kpis.stranded_pax_total - baselineKpis.stranded_pax_total : 0;

  // Render a visual row of up to 10 person icons representing stranded ratio
  const maxPaxRef = 1000;
  const filledIcons = Math.min(10, Math.ceil((kpis.stranded_pax_total / maxPaxRef) * 10));

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
      {/* 1. Delayed Flights */}
      <div
        onClick={() => onSelectFilter(activeFilter === 'delayed' ? 'all' : 'delayed')}
        className={`cr-card cr-card-interactive p-3 cursor-pointer border-l-4 transition-all ${
          activeFilter === 'delayed'
            ? 'border-l-status-minor ring-2 ring-status-minor/30 bg-amber-50/30'
            : 'border-l-status-minor'
        }`}
        role="button"
        tabIndex={0}
        aria-label={`Flights delayed: ${kpis.delayed_flights}`}
      >
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Flights Delayed
          </span>
          <AlertTriangle className="w-4 h-4 text-status-minor" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-ink tabular-nums">
            <AnimatedCounter value={kpis.delayed_flights} reducedMotion={reducedMotion} />
          </span>
          {delayedDelta !== 0 && (
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition-transform animate-in zoom-in-75 ${
                delayedDelta > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {delayedDelta > 0 ? `+${delayedDelta}` : delayedDelta}
            </span>
          )}
        </div>
        <div className="text-[10px] text-ink-muted mt-1 truncate">
          {kpis.delayed_flights > 0
            ? `${Math.round((kpis.delayed_flights / 70) * 100)}% of scheduled network`
            : 'Normal operations'}
        </div>
      </div>

      {/* 2. Total Delay Minutes */}
      <div
        onClick={() => onSelectFilter('all')}
        className="cr-card p-3 border-l-4 border-l-status-major"
      >
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Total Delay
          </span>
          <Clock className="w-4 h-4 text-status-major" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-ink tabular-nums">
            <AnimatedCounter value={kpis.total_delay_minutes} reducedMotion={reducedMotion} />
            <span className="text-xs font-normal text-ink-muted ml-0.5">m</span>
          </span>
          {delayMinsDelta !== 0 && (
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition-transform animate-in zoom-in-75 ${
                delayMinsDelta > 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {delayMinsDelta > 0 ? `+${delayMinsDelta}m` : `${delayMinsDelta}m`}
            </span>
          )}
        </div>
        <div className="text-[10px] text-ink-muted mt-1 truncate font-mono">
          Avg{' '}
          {kpis.delayed_flights > 0
            ? Math.round(kpis.total_delay_minutes / kpis.delayed_flights)
            : 0}{' '}
          min per delayed leg
        </div>
      </div>

      {/* 3. Cancelled Flights */}
      <div
        onClick={() => onSelectFilter(activeFilter === 'cancelled' ? 'all' : 'cancelled')}
        className={`cr-card cr-card-interactive p-3 cursor-pointer border-l-4 transition-all ${
          activeFilter === 'cancelled'
            ? 'border-l-status-cancelled ring-2 ring-slate-400 bg-slate-100'
            : 'border-l-status-cancelled'
        }`}
        role="button"
        tabIndex={0}
        aria-label={`Flights cancelled: ${kpis.cancelled_flights}`}
      >
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Cancelled
          </span>
          <Ban className="w-4 h-4 text-status-cancelled" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-ink tabular-nums">
            <AnimatedCounter value={kpis.cancelled_flights} reducedMotion={reducedMotion} />
          </span>
          {cancelledDelta !== 0 && (
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition-transform animate-in zoom-in-75 ${
                cancelledDelta > 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {cancelledDelta > 0 ? `+${cancelledDelta}` : cancelledDelta}
            </span>
          )}
        </div>
        <div className="text-[10px] text-ink-muted mt-1 truncate">
          {kpis.cancelled_flights > 0 ? 'Frees tail for recovery' : '0 cancellations'}
        </div>
      </div>

      {/* 4. Stranded Passengers (with person icons and split) */}
      <div
        onClick={() => onSelectFilter(activeFilter === 'stranded_conn' ? 'all' : 'stranded_conn')}
        className={`cr-card cr-card-interactive p-3 cursor-pointer border-l-4 transition-all ${
          activeFilter === 'stranded_conn'
            ? 'border-l-status-major ring-2 ring-red-400 bg-red-50/30'
            : 'border-l-status-major'
        }`}
        role="button"
        tabIndex={0}
        aria-label={`Passengers stranded: ${kpis.stranded_pax_total}`}
      >
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Stranded Pax
          </span>
          <Users className="w-4 h-4 text-status-major" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-ink tabular-nums">
            <AnimatedCounter value={kpis.stranded_pax_total} reducedMotion={reducedMotion} />
          </span>
          {strandedDelta !== 0 && (
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition-transform animate-in zoom-in-75 ${
                strandedDelta > 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {strandedDelta > 0 ? `+${strandedDelta}` : strandedDelta}
            </span>
          )}
        </div>

        {/* Visual Person Icons */}
        <div className="flex items-center gap-0.5 my-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <User
              key={i}
              className={`w-3 h-3 transition-colors duration-300 ${
                i < filledIcons
                  ? 'text-status-major fill-status-major'
                  : 'text-slate-200 fill-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="text-[10px] text-ink-muted truncate font-mono">
          <span className="text-amber-700 font-semibold">
            {kpis.stranded_pax_missed_connections}
          </span>{' '}
          missed CX ·{' '}
          <span className="text-red-700 font-semibold">
            {kpis.stranded_pax_cancelled_flights}
          </span>{' '}
          canc
        </div>
      </div>

      {/* 5. Crews at Risk / Timed Out */}
      <div
        onClick={() => onSelectFilter(activeFilter === 'crews_at_risk' ? 'all' : 'crews_at_risk')}
        className={`cr-card cr-card-interactive p-3 cursor-pointer border-l-4 transition-all ${
          activeFilter === 'crews_at_risk'
            ? 'border-l-status-closure ring-2 ring-violet-400 bg-violet-50/30'
            : 'border-l-status-closure'
        }`}
        role="button"
        tabIndex={0}
        aria-label={`Crews at risk: ${kpis.crews_at_risk}`}
      >
        <div className="flex items-center justify-between text-ink-muted mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Crews at Risk
          </span>
          <ShieldAlert className="w-4 h-4 text-status-closure" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-ink tabular-nums">
            <AnimatedCounter value={kpis.crews_at_risk} reducedMotion={reducedMotion} />
          </span>
          {kpis.crews_timed_out > 0 && (
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
              {kpis.crews_timed_out} timed out
            </span>
          )}
        </div>
        <div className="text-[10px] text-ink-muted mt-1 truncate">
          {kpis.crews_at_risk > 0
            ? 'Within 30m of 600m legal limit'
            : 'All crews within legal limits'}
        </div>
      </div>
    </div>
  );
};
