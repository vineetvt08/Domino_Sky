import React from 'react';
import { EvaluatedAction } from '../../types/engine';
import { Eye, Check, Sparkles } from 'lucide-react';

interface AiOptionCardProps {
  item: EvaluatedAction;
  isApplied: boolean;
  isPreviewed: boolean;
  onPreview: () => void;
  onApply: () => void;
}

export const AiOptionCard: React.FC<AiOptionCardProps> = ({
  item,
  isApplied,
  isPreviewed,
  onPreview,
  onApply,
}) => {
  const { action, before_kpis, after_kpis, rank } = item;

  const paxSaved = before_kpis.stranded_pax_total - after_kpis.stranded_pax_total;
  const delaySaved = before_kpis.total_delay_minutes - after_kpis.total_delay_minutes;

  return (
    <div
      className={`cr-card p-3.5 space-y-3 transition-all ${
        isApplied
          ? 'border-status-recovered ring-2 ring-status-recovered/30 bg-teal-50/20'
          : isPreviewed
          ? 'border-status-closure ring-2 ring-status-closure/30 bg-violet-50/20'
          : 'bg-white hover:border-slate-300'
      }`}
    >
      {/* Header with Rank Badge & Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                rank === 1
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-ink-muted'
              }`}
            >
              Rank #{rank}
            </span>
            {rank === 1 && (
              <span className="text-[10px] font-medium text-emerald-700 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Best Outcome
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-ink leading-snug">
            {action.title}
          </h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-ink-muted leading-relaxed">
        {action.description}
      </p>

      {/* Before -> After Mini Metrics Grid */}
      <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 border border-border rounded-lg text-center font-mono">
        <div>
          <span className="text-[9px] uppercase font-sans text-ink-muted block">
            Stranded Pax
          </span>
          <div className="text-xs font-bold text-ink">
            {after_kpis.stranded_pax_total}
          </div>
          <span className="text-[9px] text-emerald-700 font-semibold">
            {paxSaved > 0 ? `-${paxSaved}` : '0'}
          </span>
        </div>

        <div>
          <span className="text-[9px] uppercase font-sans text-ink-muted block">
            Delay Mins
          </span>
          <div className="text-xs font-bold text-ink">
            {after_kpis.total_delay_minutes}m
          </div>
          <span className="text-[9px] text-emerald-700 font-semibold">
            {delaySaved > 0 ? `-${delaySaved}m` : '0m'}
          </span>
        </div>

        <div>
          <span className="text-[9px] uppercase font-sans text-ink-muted block">
            Cancelled
          </span>
          <div className="text-xs font-bold text-ink">
            {after_kpis.cancelled_flights}
          </div>
          <span className="text-[9px] text-ink-muted">
            {after_kpis.cancelled_flights - before_kpis.cancelled_flights > 0
              ? `+${after_kpis.cancelled_flights - before_kpis.cancelled_flights}`
              : 'same'}
          </span>
        </div>
      </div>

      {/* Actions: Preview & Apply Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onPreview}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
            isPreviewed
              ? 'bg-status-closure text-white border-status-closure font-semibold shadow-xs'
              : 'bg-white text-ink-muted hover:text-ink border-border hover:bg-slate-50'
          }`}
          title="Toggle ghost preview overlay"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isPreviewed ? 'Previewing' : 'Preview'}</span>
        </button>

        <button
          onClick={onApply}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all shadow-xs ${
            isApplied
              ? 'bg-status-recovered text-white border-status-recovered'
              : 'bg-ink hover:bg-slate-800 text-white border-ink'
          }`}
          title="Commit this recovery plan"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{isApplied ? 'Applied' : 'Apply'}</span>
        </button>
      </div>
    </div>
  );
};
