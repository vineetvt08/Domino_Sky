import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plane,
  AlertTriangle,
} from 'lucide-react';
import { AirportClosure, FlightResult } from '../../types/engine';
import { formatHHMM } from '../../utils/time';

interface TimeScrubberProps {
  currentTimeMin: number;
  onTimeChange: (timeMin: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number; // 1, 4, 16
  onChangeSpeed: (speed: number) => void;
  closures: AirportClosure[];
  flights: Record<string, FlightResult>;
}

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  currentTimeMin,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  closures,
  flights,
}) => {
  const TOTAL_MINUTES = 1440;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const next = currentTimeMin + playbackSpeed;
        onTimeChange(next >= TOTAL_MINUTES ? 0 : next);
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, currentTimeMin, onTimeChange]);

  // Step +/- 15 min
  const stepTime = (delta: number) => {
    onTimeChange(Math.max(0, Math.min(TOTAL_MINUTES, currentTimeMin + delta)));
  };

  // Calculate airborne and delayed counters
  let airborneCount = 0;
  let delayedActiveCount = 0;

  for (const f of Object.values(flights)) {
    if (f.is_cancelled) continue;
    if (currentTimeMin >= f.actual_dep_min && currentTimeMin <= f.actual_arr_min) {
      airborneCount++;
      if (f.delay_minutes > 0) {
        delayedActiveCount++;
      }
    }
  }

  return (
    <div className="cr-card p-3 space-y-2 select-none shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls & Speed Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => stepTime(-15)}
            className="p-1.5 rounded hover:bg-slate-100 text-ink-muted hover:text-ink transition-colors"
            title="Step backward 15 minutes (Left arrow)"
            aria-label="Step back 15 minutes"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-2 rounded-lg bg-status-closure hover:bg-violet-700 text-white transition-colors shadow-xs"
            title="Play / Pause (Space)"
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={() => stepTime(15)}
            className="p-1.5 rounded hover:bg-slate-100 text-ink-muted hover:text-ink transition-colors"
            title="Step forward 15 minutes (Right arrow)"
            aria-label="Step forward 15 minutes"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Speed Pills (1x, 4x, 16x) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-border">
            {[1, 4, 16].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-white text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Big Time Readout */}
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold font-mono tracking-tight text-ink tabular-nums">
            {formatHHMM(currentTimeMin)}{' '}
            <span className="text-xs font-normal text-ink-muted">IST</span>
          </div>
        </div>

        {/* Real-time airborne & delayed counter */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-ink-muted">
            <Plane className="w-3.5 h-3.5 text-status-ontime" />
            <span>
              <strong className="text-ink">{airborneCount}</strong> airborne
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-muted">
            <AlertTriangle className="w-3.5 h-3.5 text-status-minor" />
            <span>
              <strong className="text-status-major">{delayedActiveCount}</strong> delayed
            </span>
          </div>
        </div>
      </div>

      {/* Scrubber Track with Shaded Closures & Plane Handle */}
      <div className="relative pt-2 pb-1">
        {/* Shaded closures on track */}
        <div className="absolute top-2 left-0 right-0 h-2 bg-slate-200 rounded-full overflow-hidden pointer-events-none">
          {closures.map((c) => (
            <div
              key={c.id}
              className="absolute top-0 bottom-0 bg-status-closure/40 border-x border-status-closure"
              style={{
                left: `${(c.start_min / TOTAL_MINUTES) * 100}%`,
                width: `${((c.end_min - c.start_min) / TOTAL_MINUTES) * 100}%`,
              }}
              title={`${c.airport} closure`}
            />
          ))}
        </div>

        {/* Range Slider with Full Keyboard Accessibility */}
        <input
          type="range"
          min="0"
          max={TOTAL_MINUTES}
          step="1"
          value={currentTimeMin}
          onChange={(e) => onTimeChange(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Home') {
              e.preventDefault();
              onTimeChange(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              onTimeChange(TOTAL_MINUTES);
            } else if (e.key === 'PageUp') {
              e.preventDefault();
              onTimeChange(Math.min(TOTAL_MINUTES, currentTimeMin + 60));
            } else if (e.key === 'PageDown') {
              e.preventDefault();
              onTimeChange(Math.max(0, currentTimeMin - 60));
            }
          }}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer accent-status-closure z-10 focus:outline-none focus:ring-2 focus:ring-status-closure focus:ring-offset-1 rounded"
          aria-label="Simulation time scrubber"
          aria-valuenow={currentTimeMin}
          aria-valuemin={0}
          aria-valuemax={TOTAL_MINUTES}
          aria-valuetext={`${formatHHMM(currentTimeMin)} IST`}
        />

        {/* Time tick labels */}
        <div className="flex justify-between text-[10px] font-mono text-ink-muted pt-0.5">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );
};
