import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Brain,
  Sparkles,
  Bot,
  ShieldCheck,
  Plane,
  RefreshCw,
} from 'lucide-react';
import { EvaluatedAction, RecoveryAction, ResultJSON } from '../../types/engine';
import { AiOptionCard } from './AiOptionCard';
import { ChatFollowUp } from './ChatFollowUp';

interface RightPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  closuresCount: number;
  onRecommendRecovery: () => void;
  isLoading: boolean;
  evaluatedActions: EvaluatedAction[];
  appliedAction?: RecoveryAction;
  previewAction?: RecoveryAction;
  onPreviewAction: (action: RecoveryAction | undefined) => void;
  onApplyAction: (action: RecoveryAction) => void;
  onUndoAppliedAction: () => void;
  baseResult?: ResultJSON;
  aiExplanation?: {
    summary: string;
    caveats: string;
    verifiedNumbersCount: number;
    correctedCount: number;
    isFallback: boolean;
  };
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  closuresCount,
  onRecommendRecovery,
  isLoading,
  evaluatedActions,
  appliedAction,
  previewAction,
  onPreviewAction,
  onApplyAction,
  onUndoAppliedAction,
  baseResult,
  aiExplanation,
}) => {
  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-l border-border flex flex-col items-center py-3 shrink-0 shadow-xs">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-slate-100 transition-colors"
          title="Expand AI Dispatcher panel"
          aria-label="Expand AI Dispatcher panel"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="mt-8 transform rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-status-closure" />
          <span>AI Recovery</span>
        </div>
      </div>
    );
  }

  return (
    <aside
      className="w-[360px] bg-slate-50 border-l border-border flex flex-col shrink-0 overflow-y-auto relative p-3 space-y-3 z-20"
      aria-label="AI Dispatcher Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-status-closure/10 text-status-closure">
            <Brain className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
            AI Dispatcher Recovery
          </h2>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-ink-muted hover:text-ink rounded hover:bg-slate-200 transition-colors"
          title="Collapse panel"
          aria-label="Collapse panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      {closuresCount === 0 ? (
        /* State 1: Idle - No closure active */
        <div className="cr-card p-6 text-center space-y-3 bg-white">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
              Network Operating Normally
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Set an airport closure on the left or click any airport on the map to evaluate disruption cascade and recovery recommendations.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        /* State 2: Working - Looping plane evaluating actions */
        <div className="cr-card p-8 text-center space-y-4 bg-white">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            {/* Dotted path ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-status-closure animate-spin duration-1000" />
            <Plane className="w-6 h-6 text-status-closure transform -rotate-45" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
              Evaluating ~100 Recovery Actions...
            </h3>
            <p className="text-xs text-ink-muted">
              Deterministic engine simulating permutations: spare aircraft swaps & selective cancellations.
            </p>
          </div>
        </div>
      ) : evaluatedActions.length === 0 ? (
        /* State 3: Ready to Recommend */
        <div className="cr-card p-5 text-center space-y-3 bg-white">
          <div className="w-10 h-10 rounded-full bg-status-closure/10 text-status-closure flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
              Disruption Detected
            </h3>
            <p className="text-xs text-ink-muted mb-3">
              {closuresCount} active closure window{closuresCount > 1 ? 's' : ''}. Run dispatcher analysis to simulate recovery options.
            </p>
            <button
              onClick={onRecommendRecovery}
              className="w-full py-2.5 px-4 bg-status-closure hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              <span>Recommend Recovery Actions</span>
            </button>
          </div>
        </div>
      ) : (
        /* State 4: Done - Top 3 Ranked Actions with Rationale */
        <div className="space-y-3">
          {/* Trust Badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {aiExplanation?.isFallback
                  ? 'Computed Engine Recommendations'
                  : `All numbers verified against engine`}
              </span>
            </div>
            <button
              onClick={onRecommendRecovery}
              className="p-1 hover:bg-emerald-100 rounded text-emerald-700 transition-colors"
              title="Re-run analysis"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Applied Action Banner */}
          {appliedAction && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-status-recovered flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-recovered" />
                  Active Recovery Plan
                </span>
                <button
                  onClick={onUndoAppliedAction}
                  className="text-xs font-medium text-slate-600 hover:text-ink underline"
                >
                  Undo
                </button>
              </div>
              <p className="text-[11px] text-teal-950 font-medium">
                {appliedAction.title}
              </p>
            </div>
          )}

          {/* AI Summary */}
          {aiExplanation?.summary && (
            <div className="cr-card p-3 bg-white text-xs text-ink leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                Dispatcher Situation Brief
              </span>
              {aiExplanation.summary}
            </div>
          )}

          {/* Option Cards */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Top 3 Evaluated Actions
            </div>
            {evaluatedActions.slice(0, 3).map((item) => (
              <AiOptionCard
                key={item.action.id}
                item={item}
                isApplied={appliedAction?.id === item.action.id}
                isPreviewed={previewAction?.id === item.action.id}
                onPreview={() =>
                  onPreviewAction(previewAction?.id === item.action.id ? undefined : item.action)
                }
                onApply={() => onApplyAction(item.action)}
              />
            ))}
          </div>

          {/* Caveats */}
          {aiExplanation?.caveats && (
            <div className="p-2.5 bg-slate-100 rounded-lg text-[10px] text-ink-muted leading-relaxed">
              <span className="font-semibold text-ink block mb-0.5">Operational Caveats:</span>
              {aiExplanation.caveats}
            </div>
          )}

          {/* Interactive Chat Follow-up */}
          {baseResult && (
            <ChatFollowUp baseResult={baseResult} topActions={evaluatedActions} />
          )}
        </div>
      )}
    </aside>
  );
};
