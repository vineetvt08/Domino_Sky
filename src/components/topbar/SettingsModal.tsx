import React from 'react';
import { X, Sliders, ShieldAlert, FastForward, Eye } from 'lucide-react';
import { EngineSettings } from '../../types/engine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EngineSettings;
  onUpdateSettings: (settings: Partial<EngineSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div
        className="cr-card w-full max-w-md p-6 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-status-closure" />
            <h2 id="settings-title" className="text-lg font-semibold text-ink">
              Simulation Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded hover:bg-background transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5">
          {/* Arrival Rule */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink mb-1.5">
              <ShieldAlert className="w-4 h-4 text-ink-muted" />
              Arrival Rule during Closure
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ arrivalRule: 'hold' })}
                className={`px-3 py-2 text-xs font-medium rounded border transition-all ${
                  settings.arrivalRule === 'hold'
                    ? 'border-status-closure bg-status-closure/10 text-status-closure font-semibold'
                    : 'border-border text-ink-muted hover:border-slate-300'
                }`}
              >
                Hold in Air (Default)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ arrivalRule: 'divert' })}
                className={`px-3 py-2 text-xs font-medium rounded border transition-all ${
                  settings.arrivalRule === 'divert'
                    ? 'border-status-closure bg-status-closure/10 text-status-closure font-semibold'
                    : 'border-border text-ink-muted hover:border-slate-300'
                }`}
              >
                Divert / Hold Ground
              </button>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              {settings.arrivalRule === 'hold'
                ? 'Airborne aircraft hold until reopening, delaying gate arrival.'
                : 'Arrival is diverted or held at origin ground slot.'}
            </p>
          </div>

          {/* Capacity Backlog Throttling */}
          <div className="flex items-start justify-between gap-3 pt-3 border-t border-border">
            <div>
              <label
                htmlFor="capacity-backlog-toggle"
                className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer"
              >
                <FastForward className="w-4 h-4 text-ink-muted" />
                Post-Reopening Capacity Throttling
              </label>
              <p className="text-xs text-ink-muted mt-0.5">
                Release held flights at most airport capacity per hour (e.g. DEL: 40/hr, BOM: 32/hr).
              </p>
            </div>
            <input
              id="capacity-backlog-toggle"
              type="checkbox"
              checked={settings.capacityBacklog}
              onChange={(e) => onUpdateSettings({ capacityBacklog: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-border text-status-closure focus:ring-status-closure cursor-pointer"
            />
          </div>

          {/* Reduce Motion */}
          <div className="flex items-start justify-between gap-3 pt-3 border-t border-border">
            <div>
              <label
                htmlFor="reduce-motion-toggle"
                className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer"
              >
                <Eye className="w-4 h-4 text-ink-muted" />
                Reduce Motion
              </label>
              <p className="text-xs text-ink-muted mt-0.5">
                Disable animations (plane flights, ripple waves, domino effects) and use instant transitions.
              </p>
            </div>
            <input
              id="reduce-motion-toggle"
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-border text-status-closure focus:ring-status-closure cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ink text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
