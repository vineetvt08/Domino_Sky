import React, { useState } from 'react';
import {
  RotateCcw,
  Share2,
  HelpCircle,
  Settings,
  Table,
  Printer,
  Sparkles,
  Plane,
  Check,
  ShieldAlert,
  GitCompare,
} from 'lucide-react';

interface TopBarProps {
  scenarioName: string;
  onScenarioNameChange: (name: string) => void;
  viewMode: 'baseline' | 'disrupted' | 'recovered';
  onViewModeChange: (mode: 'baseline' | 'disrupted' | 'recovered') => void;
  hasRecoveredAction: boolean;
  onReset: () => void;
  onShare: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onToggleTableView: () => void;
  isTableView: boolean;
  onPrint: () => void;
  onRunDemoPreset: () => void;
  onOpenWeakestAirports: () => void;
  onOpenComparisonDetails?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  scenarioName,
  onScenarioNameChange,
  viewMode,
  onViewModeChange,
  hasRecoveredAction,
  onReset,
  onShare,
  onOpenHelp,
  onOpenSettings,
  onToggleTableView,
  isTableView,
  onPrint,
  onRunDemoPreset,
  onOpenWeakestAirports,
  onOpenComparisonDetails,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const handleShareClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-white border-b border-border px-4 flex items-center justify-between shrink-0 select-none z-30 shadow-sm">
      {/* Left: Brand & Scenario Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-status-closure/10 text-status-closure flex items-center justify-center font-bold shadow-xs">
            <Plane className="w-4 h-4 transform -rotate-45" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-sm tracking-tight text-ink flex items-center gap-1.5">
              Domino Sky
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-ink-muted">
                v1.0
              </span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Editable scenario name */}
        <div className="hidden sm:flex items-center">
          {isEditingName ? (
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => onScenarioNameChange(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              autoFocus
              className="text-xs font-semibold text-ink bg-slate-50 border border-status-closure rounded px-2 py-1 outline-none w-56"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xs font-medium text-ink-muted hover:text-ink px-2 py-1 rounded hover:bg-slate-100 transition-colors flex items-center gap-1 max-w-[240px] truncate"
              title="Click to rename scenario"
            >
              <span className="truncate">{scenarioName || 'Unnamed Scenario'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Center: Segmented View Mode Toggle + Comparison Button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => onViewModeChange('baseline')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'baseline'
                ? 'bg-white text-ink shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink'
            }`}
            title="Scheduled planned state with zero disruption"
          >
            Baseline
          </button>
          <button
            onClick={() => onViewModeChange('disrupted')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'disrupted'
                ? 'bg-white text-ink shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink'
            }`}
            title="Current simulated disruption cascade"
          >
            Disrupted
          </button>
          <button
            onClick={() => hasRecoveredAction && onViewModeChange('recovered')}
            disabled={!hasRecoveredAction}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              viewMode === 'recovered'
                ? 'bg-white text-status-recovered shadow-xs font-semibold'
                : hasRecoveredAction
                ? 'text-status-recovered hover:text-teal-700'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title={
              hasRecoveredAction
                ? 'View schedule with recovery action applied'
                : 'Apply a recovery action in AI panel to unlock'
            }
          >
            <span>Recovered</span>
            {hasRecoveredAction && <span className="w-1.5 h-1.5 rounded-full bg-status-recovered" />}
          </button>
        </div>

        {hasRecoveredAction && onOpenComparisonDetails && (
          <button
            onClick={onOpenComparisonDetails}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-status-recovered bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors"
            title="View detailed Before vs After comparison diff"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Show Details</span>
          </button>
        )}
      </div>

      {/* Right Actions: Demo Preset, Weakest Airport, Share, Reset, Table, Help, Settings */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRunDemoPreset}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-status-closure bg-status-closure/10 hover:bg-status-closure/20 rounded-md transition-colors"
          title="Auto-play 'The Mumbai Domino' demo scenario"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Demo 60s</span>
        </button>

        <button
          onClick={onOpenWeakestAirports}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
          title="Simulate 1-hour closure at all 16 airports to rank weakest nodes"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>Weakest Airport</span>
        </button>

        <button
          onClick={onToggleTableView}
          className={`p-1.5 rounded-md transition-colors text-ink-muted hover:text-ink hover:bg-slate-100 ${
            isTableView ? 'bg-slate-200 text-ink' : ''
          }`}
          title={isTableView ? 'Switch to interactive graphical view' : 'Switch to accessible table view'}
          aria-label="Table view toggle"
        >
          <Table className="w-4 h-4" />
        </button>

        <button
          onClick={onPrint}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-slate-100 rounded-md transition-colors"
          title="Print or export 1-page PDF summary"
          aria-label="Print summary"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          onClick={handleShareClick}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-slate-100 rounded-md transition-colors relative"
          title="Copy scenario share link"
          aria-label="Share scenario"
        >
          {copied ? <Check className="w-4 h-4 text-status-ontime" /> : <Share2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onReset}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-slate-100 rounded-md transition-colors"
          title="Reset all closures and actions"
          aria-label="Reset simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          onClick={onOpenHelp}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-slate-100 rounded-md transition-colors"
          title="How it works (4-step tour)"
          aria-label="Help tour"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-slate-100 rounded-md transition-colors"
          title="Simulation settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
