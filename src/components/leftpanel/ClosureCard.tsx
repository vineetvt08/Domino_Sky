import React, { useState, useMemo } from 'react';
import {
  Ban,
  Clock,
  Plus,
  Trash2,
  CloudRain,
  CloudFog,
  Wind,
  Search,
} from 'lucide-react';
import { Airport } from '../../types/network';
import { AirportClosure } from '../../types/engine';
import { formatDuration, formatHHMM, parseHHMM } from '../../utils/time';

interface ClosureCardProps {
  airports: Airport[];
  closures: AirportClosure[];
  onAddClosure: (closure: AirportClosure) => void;
  onRemoveClosure: (id: string) => void;
  onUpdateClosure: (id: string, updates: Partial<AirportClosure>) => void;
  selectedAirportId?: string;
}

export const PRESET_CHIPS = [
  {
    name: 'Mumbai monsoon',
    airport: 'BOM',
    start: 840, // 14:00
    end: 930,   // 15:30
    icon: CloudRain,
  },
  {
    name: 'Delhi fog',
    airport: 'DEL',
    start: 360, // 06:00
    end: 540,   // 09:00
    icon: CloudFog,
  },
  {
    name: 'Chennai cyclone',
    airport: 'MAA',
    start: 720, // 12:00
    end: 1080,  // 18:00
    icon: Wind,
  },
];

export const ClosureCard: React.FC<ClosureCardProps> = ({
  airports,
  closures,
  onAddClosure,
  onRemoveClosure,
  selectedAirportId,
}) => {
  // Local state for draft new closure
  const [targetAirport, setTargetAirport] = useState<string>(selectedAirportId || 'BOM');
  const [airportSearch, setAirportSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [startMin, setStartMin] = useState<number>(840); // 14:00
  const [endMin, setEndMin] = useState<number>(930);     // 15:30

  // Filter airports by search query
  const filteredAirports = useMemo(() => {
    if (!airportSearch) return airports;
    const q = airportSearch.toLowerCase();
    return airports.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [airports, airportSearch]);

  const duration = Math.abs(endMin - startMin);

  const handleSliderChange = (newStart: number, newEnd: number) => {
    let s = Math.round(newStart / 5) * 5;
    let e = Math.round(newEnd / 5) * 5;
    if (s > e) {
      // Auto-swap if start > end
      const temp = s;
      s = e;
      e = temp;
    }
    setStartMin(s);
    setEndMin(e);
  };

  const handleAddClosure = () => {
    if (closures.length >= 3) return;
    let s = startMin;
    let e = endMin;
    if (s > e) {
      const temp = s;
      s = e;
      e = temp;
    }
    onAddClosure({
      id: `closure_${Date.now()}`,
      airport: targetAirport,
      start_min: s,
      end_min: e,
    });
  };

  const handleApplyPreset = (preset: (typeof PRESET_CHIPS)[0]) => {
    if (closures.length >= 3) return;
    onAddClosure({
      id: `closure_preset_${preset.airport}_${Date.now()}`,
      airport: preset.airport,
      start_min: preset.start,
      end_min: preset.end,
    });
  };

  const selectedAirportObj = airports.find((a) => a.id === targetAirport);

  return (
    <div className="cr-card p-4 space-y-4">
      {/* Title & Limits */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-status-closure/10 text-status-closure">
            <Ban className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-ink">Airport Closures</h2>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-ink-muted">
          {closures.length}/3 active
        </span>
      </div>

      {/* Active Closures List as Removable Chips */}
      {closures.length > 0 && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Active Closures
          </label>
          <div className="flex flex-col gap-1.5">
            {closures.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-status-closure/10 border border-status-closure/30 text-ink"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-status-closure font-mono">
                    {c.airport}
                  </span>
                  <span className="text-xs font-mono text-ink-muted">
                    {formatHHMM(c.start_min)} - {formatHHMM(c.end_min)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-1.5 py-0.2 rounded border border-status-closure/20">
                    {formatDuration(c.end_min - c.start_min)}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveClosure(c.id)}
                  className="text-ink-muted hover:text-status-major transition-colors p-1"
                  title="Remove closure"
                  aria-label={`Remove closure at ${c.airport}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closure Configurator (when < 3 closures) */}
      {closures.length < 3 ? (
        <div className="pt-2 border-t border-border space-y-3">
          {/* Airport Selector Dropdown with Search */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
              Select Airport
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-border rounded-lg text-xs font-medium text-ink hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-status-closure">
                  {selectedAirportObj?.id || 'Select'}
                </span>
                <span className="text-ink-muted truncate">
                  {selectedAirportObj ? `${selectedAirportObj.city} (${selectedAirportObj.name})` : ''}
                </span>
              </div>
              <span className="text-ink-muted text-[10px]">▼</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto p-1">
                <div className="p-1 sticky top-0 bg-white border-b border-border flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <input
                    type="text"
                    value={airportSearch}
                    onChange={(e) => setAirportSearch(e.target.value)}
                    placeholder="Search city or code..."
                    className="w-full text-xs outline-none bg-transparent"
                    autoFocus
                  />
                </div>
                {filteredAirports.map((ap) => (
                  <button
                    key={ap.id}
                    type="button"
                    onClick={() => {
                      setTargetAirport(ap.id);
                      setIsDropdownOpen(false);
                      setAirportSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs hover:bg-slate-100 transition-colors ${
                      targetAirport === ap.id ? 'bg-status-closure/10 font-semibold text-status-closure' : 'text-ink'
                    }`}
                  >
                    <span className="font-mono font-bold">{ap.id}</span>
                    <span className="text-ink-muted text-[11px] truncate">{ap.city}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{ap.tier.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Inputs & Readout */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Closure Window
              </span>
              <span className="text-xs font-mono font-bold text-status-closure bg-status-closure/10 px-2 py-0.5 rounded">
                Duration: {formatDuration(duration)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-ink-muted block mb-0.5">Start (HH:MM)</label>
                <input
                  type="text"
                  value={formatHHMM(startMin)}
                  onChange={(e) => {
                    const parsed = parseHHMM(e.target.value);
                    if (!isNaN(parsed)) handleSliderChange(parsed, endMin);
                  }}
                  className="w-full font-mono text-xs px-2 py-1.5 bg-slate-50 border border-border rounded text-center font-bold text-ink focus:border-status-closure outline-none"
                  placeholder="14:00"
                />
              </div>
              <div>
                <label className="text-[10px] text-ink-muted block mb-0.5">End (HH:MM)</label>
                <input
                  type="text"
                  value={formatHHMM(endMin)}
                  onChange={(e) => {
                    const parsed = parseHHMM(e.target.value);
                    if (!isNaN(parsed)) handleSliderChange(startMin, parsed);
                  }}
                  className="w-full font-mono text-xs px-2 py-1.5 bg-slate-50 border border-border rounded text-center font-bold text-ink focus:border-status-closure outline-none"
                  placeholder="15:30"
                />
              </div>
            </div>

            {/* Dual Handle Slider 00:00 - 24:00 */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="5"
                  value={startMin}
                  onChange={(e) => handleSliderChange(Number(e.target.value), endMin)}
                  className="w-full accent-status-closure h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title={`Start: ${formatHHMM(startMin)}`}
                  aria-label="Closure start time"
                />
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="5"
                  value={endMin}
                  onChange={(e) => handleSliderChange(startMin, Number(e.target.value))}
                  className="w-full accent-status-closure h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title={`End: ${formatHHMM(endMin)}`}
                  aria-label="Closure end time"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-ink-muted">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </div>

          {/* Add Closure Button */}
          <button
            onClick={handleAddClosure}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-status-closure hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Closure at {targetAirport}</span>
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-muted italic text-center py-1">
          Maximum of 3 simultaneous closures reached. Remove one to add another.
        </p>
      )}

      {/* Preset Chips */}
      <div className="pt-3 border-t border-border">
        <label className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-2">
          Historical Presets
        </label>
        <div className="flex flex-col gap-1.5">
          {PRESET_CHIPS.map((preset) => {
            const Icon = preset.icon;
            const isAlreadyActive = closures.some(
              (c) => c.airport === preset.airport && c.start_min === preset.start && c.end_min === preset.end
            );
            return (
              <button
                key={preset.name}
                onClick={() => !isAlreadyActive && handleApplyPreset(preset)}
                disabled={isAlreadyActive || closures.length >= 3}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all text-left ${
                  isAlreadyActive
                    ? 'border-status-closure/40 bg-status-closure/10 text-status-closure cursor-default font-medium'
                    : closures.length >= 3
                    ? 'border-border text-slate-300 cursor-not-allowed'
                    : 'border-border text-ink hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-ink-muted" />
                  <span className="font-medium">{preset.name}</span>
                </div>
                <span className="text-[11px] font-mono text-ink-muted">
                  {formatHHMM(preset.start)}-{formatHHMM(preset.end)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
