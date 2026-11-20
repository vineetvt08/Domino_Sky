import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FlightResult, AirportClosure, CrewDutyResult } from '../../types/engine';
import { SpareAircraft } from '../../types/network';
import { ShieldAlert, AlertCircle, ArrowUpDown, X, Plane } from 'lucide-react';

interface AircraftGanttProps {
  flights: Record<string, FlightResult>;
  recoveredFlights?: Record<string, FlightResult>;
  closures: AirportClosure[];
  crews: Record<string, CrewDutyResult>;
  spares: SpareAircraft[];
  currentTimeMin: number;
  selectedFlightId?: string;
  onSelectFlight: (id: string) => void;
  viewMode: 'baseline' | 'disrupted' | 'recovered';
  reducedMotion?: boolean;
}

type GanttSortOption = 'tail' | 'delay' | 'pax';

export const AircraftGantt: React.FC<AircraftGanttProps> = ({
  flights,
  recoveredFlights,
  closures,
  crews,
  spares,
  currentTimeMin,
  selectedFlightId,
  onSelectFlight,
  viewMode,
  reducedMotion = false,
}) => {
  const [sortOption, setSortOption] = useState<GanttSortOption>('tail');
  const [hoveredFlightId, setHoveredFlightId] = useState<string | null>(null);
  const [splitSliderX, setSplitSliderX] = useState<number>(50); // percentage 0-100 for before/after comparison
  const [isCascadeTriggered, setIsCascadeTriggered] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger domino cascade animation when closures change
  useEffect(() => {
    if (closures.length > 0 && !reducedMotion) {
      setIsCascadeTriggered(true);
      const timer = setTimeout(() => setIsCascadeTriggered(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [closures, reducedMotion]);

  // Group flights by tail
  const tailsList = useMemo(() => {
    const tailMap = new Map<string, FlightResult[]>();

    // Initialize 16 primary tails
    for (let i = 1; i <= 16; i++) {
      const id = `VT-DS${i.toString().padStart(2, '0')}`;
      tailMap.set(id, []);
    }
    // Initialize spares
    for (const spare of spares) {
      tailMap.set(spare.tail_id, []);
    }

    const currentFlights = viewMode === 'recovered' && recoveredFlights ? recoveredFlights : flights;

    for (const f of Object.values(currentFlights)) {
      if (!tailMap.has(f.tail_id)) {
        tailMap.set(f.tail_id, []);
      }
      tailMap.get(f.tail_id)!.push(f);
    }

    // Sort legs by leg_order or planned_dep
    for (const list of tailMap.values()) {
      list.sort((a, b) => a.planned_dep_min - b.planned_dep_min);
    }

    // Convert to array of tails
    const arr = Array.from(tailMap.entries()).map(([tailId, flightLegs]) => {
      const isSpare = spares.some((s) => s.tail_id === tailId);
      const totalDelay = flightLegs.reduce((acc, curr) => acc + (curr.delay_minutes || 0), 0);
      const totalPax = flightLegs.reduce((acc, curr) => acc + (curr.pax || 0), 0);
      const crew = Object.values(crews).find((c) => c.tail_id === tailId);

      return {
        tailId,
        isSpare,
        flights: flightLegs,
        totalDelay,
        totalPax,
        crew,
      };
    });

    // Sort rows
    if (sortOption === 'delay') {
      arr.sort((a, b) => {
        if (a.isSpare !== b.isSpare) return a.isSpare ? 1 : -1;
        return b.totalDelay - a.totalDelay;
      });
    } else if (sortOption === 'pax') {
      arr.sort((a, b) => {
        if (a.isSpare !== b.isSpare) return a.isSpare ? 1 : -1;
        return b.totalPax - a.totalPax;
      });
    } else {
      arr.sort((a, b) => a.tailId.localeCompare(b.tailId));
    }

    return arr;
  }, [flights, recoveredFlights, spares, crews, sortOption, viewMode]);

  // Active highlighted flight (for causal arrow tracing)
  const activeFocusFlightId = hoveredFlightId || selectedFlightId;
  const activeFocusFlight = activeFocusFlightId ? flights[activeFocusFlightId] : null;

  // Total timeline width representing 00:00 to 24:00 (1440 min)
  const TOTAL_MINUTES = 1440;

  // Convert minutes (0..1440) to percentage of timeline
  const minToPct = (min: number) => {
    return `${Math.max(0, Math.min(100, (min / TOTAL_MINUTES) * 100))}%`;
  };

  return (
    <div className="cr-card p-3 space-y-3">
      {/* Header controls: Title & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-status-closure" />
          <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
            Aircraft Rotation Gantt (16 Chains + 2 Spares)
          </h3>
          {isCascadeTriggered && (
            <span className="text-[10px] font-mono text-status-closure bg-status-closure/10 px-2 py-0.5 rounded font-bold animate-pulse">
              Cascading Delay Dominoes...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Split Slider in Recovered view */}
          {viewMode === 'recovered' && (
            <div className="flex items-center gap-2 text-xs bg-slate-100 px-2 py-1 rounded border border-border">
              <span className="text-[10px] text-ink-muted">Disrupted</span>
              <input
                type="range"
                min="0"
                max="100"
                value={splitSliderX}
                onChange={(e) => setSplitSliderX(Number(e.target.value))}
                className="w-24 accent-status-recovered h-1 bg-slate-300 rounded cursor-pointer"
                title="Split slider: Disrupted vs Recovered"
              />
              <span className="text-[10px] text-status-recovered font-bold">Recovered</span>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="text-[11px]">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as GanttSortOption)}
              className="text-xs bg-slate-50 border border-border rounded px-2 py-1 text-ink outline-none cursor-pointer"
            >
              <option value="tail">Tail (VT-DS01..16)</option>
              <option value="delay">Total Delay Minutes</option>
              <option value="pax">Passenger Impact</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gantt Scrollable Grid Container */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden border border-border rounded-lg bg-white select-none"
      >
        <div className="min-w-[860px]">
          {/* Hour Header Bar (00:00 to 24:00) */}
          <div className="flex items-center h-7 border-b border-border bg-slate-50 text-[10px] font-mono text-ink-muted">
            <div className="w-24 shrink-0 px-2 font-sans font-semibold uppercase tracking-wider text-ink border-r border-border">
              Tail ID
            </div>
            <div className="relative flex-1 h-full">
              {Array.from({ length: 25 }).map((_, h) => {
                const isMajor = h % 3 === 0;
                return (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 flex flex-col justify-between"
                    style={{ left: `${(h / 24) * 100}%` }}
                  >
                    <span
                      className={`text-[9px] -translate-x-1/2 ${
                        isMajor ? 'font-bold text-ink' : 'text-slate-400'
                      }`}
                    >
                      {h.toString().padStart(2, '0')}:00
                    </span>
                    <div
                      className={`w-px ${isMajor ? 'h-2 bg-slate-400' : 'h-1 bg-slate-200'}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tail Rows */}
          <div className="relative divide-y divide-slate-100">
            {/* Shaded Closure Windows spanning across all rows */}
            {closures.map((c) => (
              <div
                key={c.id}
                className="absolute top-0 bottom-0 pointer-events-none z-10 bg-hatched-violet border-x border-status-closure/30"
                style={{
                  left: minToPct(c.start_min),
                  width: `${((c.end_min - c.start_min) / TOTAL_MINUTES) * 100}%`,
                }}
              >
                <div className="text-[9px] font-mono font-bold text-status-closure bg-white/90 px-1 py-0.5 rounded shadow-2xs inline-block ml-1 mt-0.5 border border-status-closure/20">
                  {c.airport} CLOSED
                </div>
              </div>
            ))}

            {/* Current Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-status-major z-20 pointer-events-none"
              style={{ left: minToPct(currentTimeMin) }}
            >
              <div className="w-2 h-2 rounded-full bg-status-major -translate-x-1/2 -translate-y-1 shadow-sm" />
            </div>

            {/* Render Rows */}
            {tailsList.map(({ tailId, isSpare, flights: tailFlights, totalDelay, crew }) => {
              const lastFlight = tailFlights[tailFlights.length - 1];

              return (
                <div
                  key={tailId}
                  className={`flex items-center h-8 relative hover:bg-slate-50/70 transition-colors ${
                    isSpare ? 'bg-slate-50/50' : ''
                  }`}
                >
                  {/* Sticky Tail ID Label */}
                  <div
                    className={`w-24 shrink-0 px-2 flex items-center justify-between text-xs font-mono font-bold border-r border-border z-20 bg-white ${
                      isSpare ? 'text-slate-400 italic' : 'text-ink'
                    }`}
                  >
                    <span>{tailId}</span>
                    {totalDelay > 0 && !isSpare && (
                      <span className="text-[9px] font-normal text-status-major">
                        +{totalDelay}m
                      </span>
                    )}
                  </div>

                  {/* Flight Leg Slots */}
                  <div className="relative flex-1 h-full">
                    {/* Hour grid vertical lines */}
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0 w-px bg-slate-100 pointer-events-none"
                        style={{ left: `${(h / 24) * 100}%` }}
                      />
                    ))}

                    {/* Flight Bars */}
                    {tailFlights.map((flight) => {
                      const isSelected = selectedFlightId === flight.flight_id;
                      const isHovered = hoveredFlightId === flight.flight_id;
                      const isCausalPredecessor =
                        activeFocusFlight && activeFocusFlight.caused_by === flight.flight_id;
                      const isCausalSuccessor =
                        flight.caused_by === activeFocusFlightId;

                      const plannedLeft = minToPct(flight.planned_dep_min);
                      const plannedWidth = `${((flight.planned_arr_min - flight.planned_dep_min) / TOTAL_MINUTES) * 100}%`;

                      const actualLeft = minToPct(flight.actual_dep_min);
                      const actualWidth = `${((flight.actual_arr_min - flight.actual_dep_min) / TOTAL_MINUTES) * 100}%`;

                      // Status color
                      let barColor = 'bg-status-ontime border-emerald-600';
                      if (flight.is_cancelled) {
                        barColor = 'bg-status-cancelled border-slate-500 border-dashed';
                      } else if (flight.status === 'delayed_major') {
                        barColor = 'bg-status-major border-red-700';
                      } else if (flight.status === 'delayed_minor') {
                        barColor = 'bg-status-minor border-amber-600';
                      }

                      // Domino tipping animation style
                      const dominoDelayMs = flight.leg_order * 40;
                      const isDominoActive = isCascadeTriggered && flight.delay_minutes > 0;

                      return (
                        <React.Fragment key={flight.flight_id}>
                          {/* Thin Outline = Planned Slot */}
                          <div
                            className="absolute top-1 bottom-1 border border-slate-300 rounded-sm pointer-events-none opacity-40 z-10"
                            style={{
                              left: plannedLeft,
                              width: plannedWidth,
                            }}
                            title={`Planned: ${flight.origin} -> ${flight.destination} (${flight.planned_dep}-${flight.planned_arr})`}
                          />

                          {/* Filled Bar = Actual Slot */}
                          <div
                            onClick={() => onSelectFlight(flight.flight_id)}
                            onMouseEnter={() => setHoveredFlightId(flight.flight_id)}
                            onMouseLeave={() => setHoveredFlightId(null)}
                            style={{
                              left: actualLeft,
                              width: actualWidth,
                              transition: reducedMotion
                                ? 'none'
                                : 'left 500ms cubic-bezier(0.34, 1.56, 0.64, 1), width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                              transitionDelay: `${dominoDelayMs}ms`,
                              transform: isDominoActive ? 'rotate(3deg) scaleY(1.08)' : undefined,
                            }}
                            className={`absolute top-1.5 bottom-1.5 rounded-sm px-1 flex items-center justify-between text-[9px] font-mono font-bold text-white cursor-pointer z-20 shadow-xs border ${barColor} ${
                              isSelected
                                ? 'ring-2 ring-status-recovered ring-offset-1 scale-y-110 z-30'
                                : isHovered || isCausalPredecessor || isCausalSuccessor
                                ? 'ring-2 ring-status-closure scale-y-105 z-30'
                                : 'hover:brightness-95'
                            }`}
                            title={`${flight.flight_id}: ${flight.origin}->${flight.destination} | Dep ${flight.actual_dep} (Delay +${flight.delay_minutes}m, ${flight.cause})`}
                          >
                            <span className="truncate mr-0.5">
                              {flight.origin}-{flight.destination}
                            </span>
                            {flight.is_cancelled ? (
                              <X className="w-2.5 h-2.5 text-white shrink-0" />
                            ) : flight.delay_minutes > 0 ? (
                              <span className="text-[8px] shrink-0 font-extrabold bg-black/25 px-1 py-0.2 rounded">
                                +{flight.delay_minutes}
                              </span>
                            ) : null}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Crew Duty Badge on Tail's Last Leg */}
                    {crew && lastFlight && !isSpare && (
                      <div
                        style={{
                          left: minToPct(lastFlight.actual_arr_min + 5),
                        }}
                        className={`absolute top-1.5 bottom-1.5 flex items-center gap-1 px-1.5 rounded text-[8px] font-mono z-20 pointer-events-none border ${
                          crew.is_timed_out
                            ? 'bg-red-100 text-red-800 border-red-300 font-bold'
                            : crew.is_at_risk
                            ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                            : 'bg-slate-100 text-ink-muted border-slate-200'
                        }`}
                        title={`Crew ${crew.crew_id}: ${crew.duty_used_mins} / ${crew.max_duty_mins} mins duty`}
                      >
                        {crew.is_timed_out ? (
                          <AlertCircle className="w-2.5 h-2.5 text-red-600" />
                        ) : crew.is_at_risk ? (
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                        ) : null}
                        <span>{crew.duty_used_mins}m</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
