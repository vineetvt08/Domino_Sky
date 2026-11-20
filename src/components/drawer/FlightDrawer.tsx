import React from 'react';
import {
  X,
  Plane,
  Users,
  ArrowRight,
  GitMerge,
  Ban,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { FlightResult, ConnectionResult, CrewDutyResult } from '../../types/engine';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface FlightDrawerProps {
  flight: FlightResult | null;
  onClose: () => void;
  connections: Record<string, ConnectionResult>;
  crew?: CrewDutyResult;
  onSimulateCancelFlight: (flightId: string) => void;
  onSimulateSwapSpare: (flight: FlightResult) => void;
  onJumpToFlight: (flightId: string) => void;
  onJumpToAirport: (airportId: string) => void;
}

export const FlightDrawer: React.FC<FlightDrawerProps> = ({
  flight,
  onClose,
  connections,
  crew,
  onSimulateCancelFlight,
  onSimulateSwapSpare,
  onJumpToFlight,
  onJumpToAirport,
}) => {
  const containerRef = useFocusTrap<HTMLDivElement>({
    isOpen: !!flight,
    onClose,
  });

  if (!flight) return null;

  // Filter connections associated with this flight (either as from_flight or to_flight)
  const relatedConnections = Object.values(connections).filter(
    (c) => c.from_flight === flight.flight_id || c.to_flight === flight.flight_id
  );

  // Status badge styling
  let statusBadge = (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
      On-Time
    </span>
  );
  if (flight.is_cancelled) {
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 border border-slate-300">
        Cancelled
      </span>
    );
  } else if (flight.status === 'delayed_major') {
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
        Delayed (+{flight.delay_minutes}m)
      </span>
    );
  } else if (flight.status === 'delayed_minor') {
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
        Delayed (+{flight.delay_minutes}m)
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-y-0 right-0 w-[380px] bg-white border-l border-border shadow-2xl z-50 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`Flight details for ${flight.flight_id}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-status-closure/10 text-status-closure flex items-center justify-center font-bold">
            <Plane className="w-4 h-4 transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-ink">
                {flight.flight_id}
              </span>
              <span className="text-xs font-mono font-medium text-ink-muted">
                {flight.tail_id} (Leg {flight.leg_order})
              </span>
            </div>
            <div className="text-xs text-ink-muted flex items-center gap-1 font-medium">
              <button
                onClick={() => onJumpToAirport(flight.origin)}
                className="hover:text-status-closure underline decoration-dotted"
              >
                {flight.origin}
              </button>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <button
                onClick={() => onJumpToAirport(flight.destination)}
                className="hover:text-status-closure underline decoration-dotted"
              >
                {flight.destination}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusBadge}
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-slate-200 transition-colors"
            aria-label="Close flight drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Planned vs Actual Times Card */}
        <div className="cr-card p-3 bg-slate-50 border-border">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider block mb-1">
                Departure
              </span>
              <div className="font-mono">
                <div className="text-ink font-bold text-sm">
                  {flight.actual_dep}{' '}
                  <span className="text-[10px] text-ink-muted font-normal">actual</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {flight.planned_dep} planned
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider block mb-1">
                Arrival
              </span>
              <div className="font-mono">
                <div className="text-ink font-bold text-sm">
                  {flight.actual_arr}{' '}
                  <span className="text-[10px] text-ink-muted font-normal">actual</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {flight.planned_arr} planned
                </div>
              </div>
            </div>
          </div>

          {flight.delay_minutes > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
              <span className="text-ink-muted">Net Delay:</span>
              <span className="font-bold text-status-major">
                +{flight.delay_minutes} minutes
              </span>
            </div>
          )}
        </div>

        {/* Vertical Cause Chain */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5 text-status-closure" />
            Root Cause & Cascade Chain
          </h4>

          <div className="p-3 bg-slate-50 border border-border rounded-lg space-y-2.5 text-xs">
            {flight.cause === 'none' ? (
              <div className="text-status-ontime font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-ontime" />
                Flight operated on schedule with standard turnaround buffer.
              </div>
            ) : (
              <div className="relative pl-5 border-l-2 border-status-closure/40 space-y-3">
                {/* Step 1: Initial Cause */}
                <div className="relative">
                  <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-status-closure text-white flex items-center justify-center text-[8px] font-bold">
                    1
                  </span>
                  {flight.cause === 'closure_hold' ? (
                    <div>
                      <span className="font-bold text-status-closure">Airport Closure Hold</span>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Ground stop at{' '}
                        <button
                          onClick={() => flight.caused_by && onJumpToAirport(flight.caused_by)}
                          className="font-bold text-ink underline"
                        >
                          {flight.caused_by || flight.origin}
                        </button>{' '}
                        held this aircraft until airfield reopening.
                      </p>
                    </div>
                  ) : flight.cause === 'aircraft_knock_on' ? (
                    <div>
                      <span className="font-bold text-amber-700">Aircraft Knock-On Squeeze</span>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Inbound flight{' '}
                        <button
                          onClick={() => flight.caused_by && onJumpToFlight(flight.caused_by)}
                          className="font-bold text-ink underline font-mono"
                        >
                          {flight.caused_by}
                        </button>{' '}
                        arrived late on tail {flight.tail_id}, consuming turnaround buffer.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-status-major">Crew Duty Exceeded</span>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Flight cancelled because flight duty hours exceeded legal maximum.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 2: Delay Result */}
                <div className="relative">
                  <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[8px] font-bold">
                    2
                  </span>
                  <div className="text-[11px] text-ink font-medium">
                    Added <strong className="font-mono text-status-major">+{flight.delay_minutes} min</strong> to schedule
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Passenger & Connections Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-status-closure" />
              Passengers & Connections
            </span>
            <span className="font-mono font-bold text-ink">
              {flight.pax} pax onboard
            </span>
          </div>

          {relatedConnections.length > 0 ? (
            <div className="space-y-1.5">
              {relatedConnections.map((cx) => (
                <div
                  key={cx.connection_id}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    cx.is_missed
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div>
                    <div className="font-bold font-mono">
                      {cx.connection_id} at {cx.airport}
                    </div>
                    <div className="text-[10px] opacity-80">
                      {cx.from_flight} ➔ {cx.to_flight} ({cx.passengers} pax)
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    {cx.is_missed ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-200 text-red-900">
                        Missed (by {cx.min_connect_minutes - cx.actual_connection_time}m)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        Made ({cx.actual_connection_time}m)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted italic">
              No interline connections booked on this flight.
            </p>
          )}
        </div>

        {/* Crew Duty Progress Bar */}
        {crew && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-status-closure" />
                Crew Duty ({crew.crew_id})
              </span>
              <span className="font-mono font-bold text-ink">
                {crew.duty_used_mins} / {crew.max_duty_mins}m
              </span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  crew.is_timed_out
                    ? 'bg-status-major'
                    : crew.is_at_risk
                    ? 'bg-status-minor'
                    : 'bg-status-ontime'
                }`}
                style={{
                  width: `${Math.min(100, (crew.duty_used_mins / crew.max_duty_mins) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-ink-muted flex justify-between">
              <span>Duty started at {crew.duty_start}</span>
              <span>{Math.max(0, crew.max_duty_mins - crew.duty_used_mins)}m buffer left</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer: Quick Simulation Buttons */}
      <div className="p-3 border-t border-border bg-slate-50 flex items-center gap-2 shrink-0">
        <button
          onClick={() => onSimulateCancelFlight(flight.flight_id)}
          className="flex-1 py-2 px-3 bg-white hover:bg-red-50 text-status-major border border-red-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Cancel Flight (Sim)</span>
        </button>

        <button
          onClick={() => onSimulateSwapSpare(flight)}
          className="flex-1 py-2 px-3 bg-white hover:bg-teal-50 text-status-recovered border border-teal-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Swap Spare</span>
        </button>
      </div>
    </div>
  );
};
