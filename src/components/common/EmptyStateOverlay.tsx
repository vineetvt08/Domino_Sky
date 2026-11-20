import React from 'react';
import { Plane, X } from 'lucide-react';

interface EmptyStateOverlayProps {
  onDismiss: () => void;
  onSelectBOM: () => void;
}

export const EmptyStateOverlay: React.FC<EmptyStateOverlayProps> = ({
  onDismiss,
  onSelectBOM,
}) => {
  return (
    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-md border border-status-closure/40 shadow-xl rounded-xl p-4 flex items-center gap-4 max-w-md animate-bounce duration-1000">
        <div className="w-10 h-10 rounded-full bg-status-closure/10 text-status-closure flex items-center justify-center shrink-0">
          <Plane className="w-5 h-5 transform -rotate-45" />
        </div>

        <div className="flex-1">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-0.5">
            Click any airport to close it
          </h4>
          <p className="text-xs text-ink-muted">
            Simulate a weather ground-stop or choose{' '}
            <button
              onClick={onSelectBOM}
              className="text-status-closure font-bold underline hover:text-violet-800"
            >
              Mumbai (BOM)
            </button>{' '}
            to watch the delay cascade across India.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
          aria-label="Dismiss guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
