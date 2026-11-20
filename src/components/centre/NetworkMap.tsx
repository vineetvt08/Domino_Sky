import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Airport } from '../../types/network';
import { AirportClosure, FlightResult, AirportImpact } from '../../types/engine';
import {
  INDIA_BOUNDARY_COORDS,
  createIndiaProjection,
  projectLatLng,
  createFlightArcPath,
  getArcPosition,
} from '../../utils/geo';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface NetworkMapProps {
  airports: Airport[];
  flights: Record<string, FlightResult>;
  closures: AirportClosure[];
  airportImpacts: Record<string, AirportImpact>;
  currentTimeMin: number;
  selectedAirportId?: string;
  selectedFlightId?: string;
  onSelectAirport: (id: string) => void;
  onSelectFlight: (id: string) => void;
  onRequestCloseAirport: (airportId: string) => void;
  reducedMotion?: boolean;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  airports,
  flights,
  closures,
  airportImpacts,
  currentTimeMin,
  selectedAirportId,
  selectedFlightId,
  onSelectAirport,
  onSelectFlight,
  onRequestCloseAirport,
  reducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [hoveredAirport, setHoveredAirport] = useState<Airport | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);

  // Resize observer to keep SVG responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.max(400, entry.contentRect.width),
          height: Math.max(350, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const projection = useMemo(() => {
    return createIndiaProjection(dimensions.width, dimensions.height);
  }, [dimensions.width, dimensions.height]);

  // Project India boundary path
  const boundaryPath = useMemo(() => {
    const points = INDIA_BOUNDARY_COORDS.map((coord) => {
      const p = projection([coord[0], coord[1]]);
      return p ? `${p[0].toFixed(1)},${p[1].toFixed(1)}` : '';
    }).filter(Boolean);
    return points.length > 0 ? `M ${points.join(' L ')} Z` : '';
  }, [projection]);

  // Map of airport positions
  const airportPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const ap of airports) {
      const p = projectLatLng(ap.lat, ap.lng, projection);
      if (p) {
        map.set(ap.id, { x: p[0], y: p[1] });
      }
    }
    return map;
  }, [airports, projection]);

  // Closed airports set
  const closedAirportsSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of closures) {
      if (currentTimeMin >= c.start_min && currentTimeMin < c.end_min) {
        set.add(c.airport);
      }
    }
    return set;
  }, [closures, currentTimeMin]);

  // Active flights at currentTimeMin
  const activeFlightsList = useMemo(() => {
    const active: Array<{
      flight: FlightResult;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      progress: number;
      isHeldAtOrigin: boolean;
    }> = [];

    for (const f of Object.values(flights)) {
      if (f.is_cancelled) continue;
      const originPos = airportPositions.get(f.origin);
      const destPos = airportPositions.get(f.destination);
      if (!originPos || !destPos) continue;

      // Flight is active if within [actual_dep_min, actual_arr_min]
      if (currentTimeMin >= f.actual_dep_min && currentTimeMin <= f.actual_arr_min) {
        const totalDuration = Math.max(1, f.actual_arr_min - f.actual_dep_min);
        const progress = Math.min(1, Math.max(0, (currentTimeMin - f.actual_dep_min) / totalDuration));
        active.push({
          flight: f,
          x1: originPos.x,
          y1: originPos.y,
          x2: destPos.x,
          y2: destPos.y,
          progress,
          isHeldAtOrigin: false,
        });
      } else if (
        // Aircraft waiting on the ground during a closure hold
        currentTimeMin >= f.planned_dep_min &&
        currentTimeMin < f.actual_dep_min &&
        f.cause === 'closure_hold'
      ) {
        active.push({
          flight: f,
          x1: originPos.x,
          y1: originPos.y,
          x2: destPos.x,
          y2: destPos.y,
          progress: 0,
          isHeldAtOrigin: true,
        });
      }
    }

    return active;
  }, [flights, airportPositions, currentTimeMin]);

  // Zoom & Pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(4, Math.max(0.7, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="cr-card relative w-full h-[460px] overflow-hidden select-none bg-slate-50 cursor-grab active:cursor-grabbing border border-border"
      aria-label="Interactive India flight network map"
    >
      {/* Map Controls (Top Right) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button
          onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
          className="p-1.5 bg-white/95 text-ink hover:text-status-closure border border-border rounded shadow-xs hover:bg-white transition-all"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.7, z / 1.2))}
          className="p-1.5 bg-white/95 text-ink hover:text-status-closure border border-border rounded shadow-xs hover:bg-white transition-all"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 bg-white/95 text-ink hover:text-status-closure border border-border rounded shadow-xs hover:bg-white transition-all"
          title="Fit to view"
          aria-label="Reset map view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend Toggle (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-10">
        <div className="bg-white/95 backdrop-blur-xs border border-border rounded-lg shadow-sm text-xs p-2">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center gap-1.5 font-semibold text-ink text-[11px] uppercase tracking-wider"
          >
            <Layers className="w-3.5 h-3.5 text-status-closure" />
            <span>Map Legend</span>
            {showLegend ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronUp className="w-3 h-3 ml-1" />}
          </button>
          {showLegend && (
            <div className="mt-2 pt-2 border-t border-border space-y-1.5 text-[11px] text-ink-muted">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-ontime" />
                <span>On-time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-minor" />
                <span>Delayed 1-30 min</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-major" />
                <span>Delayed 31+ min</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-status-closure flex items-center justify-center text-[7px] font-bold text-status-closure">
                  ⊘
                </span>
                <span>Closed Airport</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-status-closure" />
                <span>Mega Hub (double ring)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Map Canvas */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      >
        <defs>
          {/* Hatched pattern for closed airports */}
          <pattern
            id="closureHatch"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#7C5CFC" strokeWidth="2.5" opacity="0.4" />
          </pattern>
          {/* Plane marker arrow */}
          <marker
            id="planeMarker"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1F2A44" opacity="0.6" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* India Boundary Outline */}
          {boundaryPath && (
            <path
              d={boundaryPath}
              fill="#E8EEF7"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              className="transition-colors"
            />
          )}

          {/* Active Flight Arcs */}
          {activeFlightsList.map(({ flight, x1, y1, x2, y2, progress, isHeldAtOrigin }) => {
            const arcPath = createFlightArcPath(x1, y1, x2, y2);
            const isSelected = selectedFlightId === flight.flight_id;
            const pos = getArcPosition(x1, y1, x2, y2, progress);

            // Arc color
            let arcColor = '#2BB673';
            if (flight.status === 'delayed_major') arcColor = '#E5484D';
            else if (flight.status === 'delayed_minor') arcColor = '#F2A900';

            return (
              <g
                key={flight.flight_id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFlight(flight.flight_id);
                }}
                className="cursor-pointer group"
              >
                {/* Background arc glow when selected */}
                {isSelected && (
                  <path
                    d={arcPath}
                    fill="none"
                    stroke="#14B8C4"
                    strokeWidth="6"
                    opacity="0.4"
                  />
                )}

                {/* Base Flight Arc */}
                <path
                  d={arcPath}
                  fill="none"
                  stroke={arcColor}
                  strokeWidth={isSelected ? '3' : '1.8'}
                  strokeDasharray={isSelected ? '4,2' : undefined}
                  opacity={isSelected ? 1 : 0.8}
                  className="transition-all"
                />

                {/* Moving Paper Plane Glyphs along route */}
                {!isHeldAtOrigin && (
                  <g transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angleDeg})`}>
                    {/* Tiny Paper-plane glyph */}
                    <path
                      d="M 6 0 L -5 -4 L -2 0 L -5 4 Z"
                      fill={arcColor}
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                      className="shadow-sm filter drop-shadow(0 1px 1px rgba(0,0,0,0.2))"
                    />
                  </g>
                )}

                {/* Holding loop at origin if held during closure */}
                {isHeldAtOrigin && (
                  <g transform={`translate(${x1}, ${y1})`}>
                    <circle
                      r="12"
                      fill="none"
                      stroke="#7C5CFC"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      className={reducedMotion ? '' : 'animate-spin origin-center'}
                    />
                    <circle r="3" fill="#7C5CFC" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Airport Nodes */}
          {airports.map((ap) => {
            const pos = airportPositions.get(ap.id);
            if (!pos) return null;

            const isClosed = closedAirportsSet.has(ap.id);
            const isSelected = selectedAirportId === ap.id;

            // Airport radius based on capacity
            const baseRadius = ap.tier === 'mega_hub' ? 7 : ap.tier === 'regional_hub' ? 5 : 3.5;

            return (
              <g
                key={ap.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAirport(ap.id);
                  if (!isClosed && closures.length < 3) {
                    onRequestCloseAirport(ap.id);
                  }
                }}
                onMouseEnter={(e) => {
                  setHoveredAirport(ap);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setHoverPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredAirport(null)}
                className="cursor-pointer group"
              >
                {/* Ripple wave and violet hatched halo when closed */}
                {isClosed && (
                  <>
                    <circle
                      r={baseRadius * 4}
                      fill="url(#closureHatch)"
                      className="transition-all"
                    />
                    <circle
                      r={baseRadius * 4}
                      fill="none"
                      stroke="#7C5CFC"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      className={reducedMotion ? '' : 'animate-pulse'}
                    />
                    {/* Drifting Weather Cloud with Light Rain */}
                    {!reducedMotion && (
                      <g transform="translate(-12, -28)" className="opacity-90 pointer-events-none">
                        {/* Cloud shape */}
                        <path
                          d="M 6 12 C 4 12 2 10 2 8 C 2 6 4 4 6 4 C 7 2 10 1 13 2 C 16 2 18 4 18 6 C 20 6 22 8 22 10 C 22 12 20 12 18 12 Z"
                          fill="#64748B"
                          opacity="0.85"
                        />
                        {/* Light Rain drops */}
                        <line x1="7" y1="14" x2="6" y2="18" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />
                        <line x1="12" y1="14" x2="11" y2="18" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />
                        <line x1="17" y1="14" x2="16" y2="18" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />
                      </g>
                    )}
                  </>
                )}

                {/* Selection indicator ring */}
                {isSelected && (
                  <circle
                    r={baseRadius * 2.2}
                    fill="none"
                    stroke="#14B8C4"
                    strokeWidth="2.5"
                    strokeDasharray="3,2"
                  />
                )}

                {/* Double ring for mega hubs */}
                {ap.tier === 'mega_hub' && (
                  <circle
                    r={baseRadius + 3}
                    fill="none"
                    stroke={isClosed ? '#7C5CFC' : '#1F2A44'}
                    strokeWidth="1.2"
                    opacity="0.6"
                  />
                )}

                {/* Center airport dot */}
                <circle
                  r={baseRadius}
                  fill={isClosed ? '#7C5CFC' : '#1F2A44'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="transition-all group-hover:scale-125 origin-center"
                />

                {/* No-entry badge for closed airports */}
                {isClosed && (
                  <g transform="translate(4, -12)">
                    <circle r="6" fill="#7C5CFC" stroke="#FFFFFF" strokeWidth="1" />
                    <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                )}

                {/* IATA Code Label */}
                <text
                  x={baseRadius + 5}
                  y={4}
                  className={`text-[10px] font-mono font-bold select-none transition-all ${
                    isClosed
                      ? 'fill-status-closure font-black'
                      : isSelected
                      ? 'fill-status-recovered font-black'
                      : ap.tier === 'spoke'
                      ? 'fill-slate-500 opacity-70 group-hover:opacity-100 group-hover:fill-ink'
                      : 'fill-ink'
                  }`}
                >
                  {ap.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Airport Hover Tooltip */}
      {hoveredAirport && (
        <div
          className="absolute z-40 bg-white/95 backdrop-blur-md border border-border p-2.5 rounded-lg shadow-xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 min-w-[180px]"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-border">
            <span className="font-mono font-bold text-ink text-sm">
              {hoveredAirport.id}
            </span>
            <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-slate-100 text-ink-muted">
              {hoveredAirport.tier.replace('_', ' ')}
            </span>
          </div>
          <div className="text-[11px] font-medium text-ink mb-1 truncate">
            {hoveredAirport.city} · {hoveredAirport.name}
          </div>
          <div className="space-y-0.5 text-[10px] text-ink-muted">
            <div className="flex justify-between">
              <span>Capacity:</span>
              <strong className="text-ink font-mono">{hoveredAirport.capacity_per_hour}/hr</strong>
            </div>
            <div className="flex justify-between">
              <span>Delayed flights:</span>
              <strong className="text-status-major font-mono">
                {airportImpacts[hoveredAirport.id]?.departures_delayed ?? 0} dep /{' '}
                {airportImpacts[hoveredAirport.id]?.arrivals_delayed ?? 0} arr
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Stranded pax:</span>
              <strong className="text-amber-700 font-mono">
                {airportImpacts[hoveredAirport.id]?.stranded_pax ?? 0}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
