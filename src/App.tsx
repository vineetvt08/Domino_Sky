import React, { useState, useEffect, useMemo, useCallback } from 'react';
import rawData from '../data/flight_network.json';
import { NetworkData } from './types/network';
import {
  AirportClosure,
  EngineSettings,
  EvaluatedAction,
  RecoveryAction,
  ResultJSON,
} from './types/engine';
import { validateNetworkData } from './engine/validator';
import { runSimulation } from './engine/simulator';
import { enumerateRecoveryActions } from './engine/recoveryEnumerator';
import { TopBar } from './components/topbar/TopBar';
import { SettingsModal } from './components/topbar/SettingsModal';
import { LeftPanel } from './components/leftpanel/LeftPanel';
import { RightPanel } from './components/rightpanel/RightPanel';
import { KpiStrip, KpiFilterType } from './components/centre/KpiStrip';
import { DelayRibbon } from './components/centre/DelayRibbon';
import { NetworkMap } from './components/centre/NetworkMap';
import { AircraftGantt } from './components/centre/AircraftGantt';
import { TimeScrubber } from './components/centre/TimeScrubber';
import { FlightDrawer } from './components/drawer/FlightDrawer';
import { StatusBar } from './components/statusbar/StatusBar';
import { EmptyStateOverlay } from './components/common/EmptyStateOverlay';
import { HelpTourModal } from './components/common/HelpTourModal';
import { TableViewModal } from './components/centre/TableViewModal';
import { WeakestAirportsModal } from './components/centre/WeakestAirportsModal';
import { ComparisonDetailsModal } from './components/centre/ComparisonDetailsModal';
import { PrintSummaryModal } from './components/common/PrintSummaryModal';
import { requestDispatcherRecommendation } from './services/aiDispatcher';
import { playRecoveryChime } from './utils/audio';
import { encodeStateToHash, decodeHashToState } from './utils/urlState';
import { formatHHMM } from './utils/time';
import { DispatchResultPayload } from '../server/gemini';

const networkData = rawData as NetworkData;

export const App: React.FC = () => {
  // Validate network data on load
  const validation = useMemo(() => validateNetworkData(networkData), []);

  // Settings
  const [settings, setSettings] = useState<EngineSettings>({
    arrivalRule: 'hold',
    capacityBacklog: false,
    reducedMotion: false,
  });

  // Scenario & Closures
  const [closures, setClosures] = useState<AirportClosure[]>([]);
  const [scenarioName, setScenarioName] = useState<string>('Clear Skies');
  const [viewMode, setViewMode] = useState<'baseline' | 'disrupted' | 'recovered'>('disrupted');

  // History stack for Undo/Redo
  const [history, setHistory] = useState<AirportClosure[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Time & Scrubber state (0..1440 min)
  const [currentTimeMin, setCurrentTimeMin] = useState<number>(840); // 14:00 default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Selections
  const [selectedAirportId, setSelectedAirportId] = useState<string | undefined>(undefined);
  const [hoveredAirportId, setHoveredAirportId] = useState<string | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | undefined>(undefined);
  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilterType>('all');

  // Layout collapses
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isTableViewOpen, setIsTableViewOpen] = useState<boolean>(false);
  const [isWeakestOpen, setIsWeakestOpen] = useState<boolean>(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [showEmptyOverlay, setShowEmptyOverlay] = useState<boolean>(true);

  // Recovery & AI Actions
  const [appliedAction, setAppliedAction] = useState<RecoveryAction | undefined>(undefined);
  const [previewAction, setPreviewAction] = useState<RecoveryAction | undefined>(undefined);
  const [evaluatedActions, setEvaluatedActions] = useState<EvaluatedAction[]>([]);
  const [aiExplanation, setAiExplanation] = useState<DispatchResultPayload | undefined>(undefined);
  const [isEvaluatingAi, setIsEvaluatingAi] = useState<boolean>(false);

  // Restore URL state on mount if present
  useEffect(() => {
    const saved = decodeHashToState();
    if (saved) {
      if (saved.closures.length > 0) {
        setClosures(saved.closures);
        setShowEmptyOverlay(false);
      }
      if (saved.scenarioName) setScenarioName(saved.scenarioName);
      if (saved.viewMode) setViewMode(saved.viewMode);
    }
  }, []);

  // Update scenario name auto-fill when closures change
  useEffect(() => {
    if (closures.length === 0) {
      setScenarioName('Clear Skies (Baseline)');
    } else {
      const summary = closures
        .map((c) => `${c.airport} closed ${formatHHMM(c.start_min)}-${formatHHMM(c.end_min)}`)
        .join(', ');
      setScenarioName(summary);
    }
  }, [closures]);

  // Compute baseline result (zero closures)
  const baselineResult: ResultJSON = useMemo(() => {
    return runSimulation(networkData, [], { settings });
  }, [settings]);

  // Compute disrupted simulation result (live recomputation, deterministic)
  const disruptedResult: ResultJSON = useMemo(() => {
    return runSimulation(networkData, closures, { settings });
  }, [closures, settings]);

  // Compute recovered simulation result (if applied or previewed)
  const recoveredResult: ResultJSON | undefined = useMemo(() => {
    const actionToSimulate = previewAction || appliedAction;
    if (!actionToSimulate) return undefined;

    if (actionToSimulate.type === 'cancel_flight' && actionToSimulate.flight_id) {
      return runSimulation(networkData, closures, {
        settings,
        forcedCancellations: new Set([actionToSimulate.flight_id]),
      });
    }

    if (
      actionToSimulate.type === 'swap_spare' &&
      actionToSimulate.target_tail_id &&
      actionToSimulate.from_leg_order &&
      actionToSimulate.spare_tail_id
    ) {
      const overrides = new Map<string, Partial<(typeof networkData.flights)[0]>>();
      for (const f of networkData.flights) {
        if (
          f.tail_id === actionToSimulate.target_tail_id &&
          f.leg_order >= actionToSimulate.from_leg_order
        ) {
          overrides.set(f.flight_id, { tail_id: actionToSimulate.spare_tail_id });
        }
      }
      return runSimulation(networkData, closures, {
        settings,
        flightOverrides: overrides,
      });
    }

    return undefined;
  }, [appliedAction, previewAction, closures, settings]);

  // Current active result based on view mode
  const currentResult: ResultJSON = useMemo(() => {
    if (viewMode === 'baseline') return baselineResult;
    if (viewMode === 'recovered' && recoveredResult) return recoveredResult;
    return disruptedResult;
  }, [viewMode, baselineResult, disruptedResult, recoveredResult]);

  // Closure state mutation with history push
  const updateClosuresWithHistory = useCallback((newClosures: AirportClosure[]) => {
    setClosures(newClosures);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newClosures]);
    setHistoryIndex((prev) => prev + 1);
    setShowEmptyOverlay(false);
  }, [historyIndex]);

  const handleAddClosure = (c: AirportClosure) => {
    updateClosuresWithHistory([...closures, c]);
  };

  const handleRemoveClosure = (id: string) => {
    updateClosuresWithHistory(closures.filter((c) => c.id !== id));
  };

  const handleUpdateClosure = (id: string, updates: Partial<AirportClosure>) => {
    updateClosuresWithHistory(
      closures.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleReset = () => {
    setClosures([]);
    setAppliedAction(undefined);
    setPreviewAction(undefined);
    setEvaluatedActions([]);
    setAiExplanation(undefined);
    setViewMode('disrupted');
    setSelectedAirportId(undefined);
    setSelectedFlightId(undefined);
    setHistory([]);
    setHistoryIndex(-1);
    window.location.hash = '';
  };

  // Recommend Recovery button click
  const handleRecommendRecovery = async () => {
    setIsEvaluatingAi(true);
    try {
      const { top3 } = enumerateRecoveryActions(
        networkData,
        closures,
        disruptedResult
      );
      setEvaluatedActions(top3);

      const aiData = await requestDispatcherRecommendation(disruptedResult, top3);
      setAiExplanation(aiData);
    } catch (err) {
      console.error('Failed to get recommendation:', err);
    } finally {
      setIsEvaluatingAi(false);
    }
  };

  // Apply Recovery Action
  const handleApplyAction = (action: RecoveryAction) => {
    setAppliedAction(action);
    setPreviewAction(undefined);
    setViewMode('recovered');
    playRecoveryChime(true);
  };

  // Undo Applied Action
  const handleUndoAppliedAction = () => {
    setAppliedAction(undefined);
    setPreviewAction(undefined);
    setViewMode('disrupted');
  };

  // Demo Preset: "The Mumbai Domino" 60-second walkthrough
  const handleRunDemoPreset = () => {
    handleReset();
    const bomClosure: AirportClosure = {
      id: 'demo_mumbai_monsoon',
      airport: 'BOM',
      start_min: 840, // 14:00
      end_min: 930,   // 15:30
    };
    updateClosuresWithHistory([bomClosure]);
    setCurrentTimeMin(840);
    setIsPlaying(true);
    setPlaybackSpeed(4);

    // Auto-recommend recovery after brief cascade demonstration
    setTimeout(() => {
      const { top3 } = enumerateRecoveryActions(networkData, [bomClosure], runSimulation(networkData, [bomClosure]));
      setEvaluatedActions(top3);
      if (top3.length > 0) {
        setTimeout(() => {
          handleApplyAction(top3[0].action);
        }, 1200);
      }
    }, 2500);
  };

  // Share scenario
  const handleShare = () => {
    const hash = encodeStateToHash({
      scenarioName,
      closures,
      viewMode,
    });
    window.location.hash = hash;
    navigator.clipboard?.writeText(window.location.href);
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTimeMin((prev) => Math.max(0, prev - 15));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTimeMin((prev) => Math.min(1440, prev + 15));
      } else if (e.code === 'Escape') {
        setSelectedFlightId(undefined);
        setIsSettingsOpen(false);
        setIsHelpOpen(false);
        setIsTableViewOpen(false);
        setIsWeakestOpen(false);
        setIsComparisonOpen(false);
        setIsPrintOpen(false);
      } else if (e.key === 'r' || e.key === 'R') {
        if (closures.length > 0 && !isEvaluatingAi) {
          handleRecommendRecovery();
        }
      } else if (e.key === '1') {
        setViewMode('baseline');
      } else if (e.key === '2') {
        setViewMode('disrupted');
      } else if (e.key === '3' && appliedAction) {
        setViewMode('recovered');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo
          if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setClosures(history[historyIndex + 1]);
          }
        } else {
          // Undo
          if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setClosures(history[historyIndex - 1]);
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setClosures([]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closures, isEvaluatingAi, appliedAction, history, historyIndex]);

  // Selected Flight Object
  const selectedFlightObj = selectedFlightId ? currentResult.flights[selectedFlightId] || null : null;
  const selectedCrewObj = selectedFlightObj
    ? Object.values(currentResult.crews).find((c) => c.tail_id === selectedFlightObj.tail_id)
    : undefined;

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-red-50 p-8 flex items-center justify-center font-mono">
        <div className="bg-white border-2 border-red-500 rounded-xl p-6 max-w-lg shadow-xl space-y-3">
          <h1 className="text-red-700 font-bold text-lg">flight_network.json Invalid</h1>
          <ul className="text-xs text-red-600 list-disc pl-4 space-y-1">
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-ink font-sans select-none">
      {/* Top Bar (56px) */}
      <TopBar
        scenarioName={scenarioName}
        onScenarioNameChange={setScenarioName}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasRecoveredAction={!!appliedAction}
        onReset={handleReset}
        onShare={handleShare}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTableView={() => setIsTableViewOpen((v) => !v)}
        isTableView={isTableViewOpen}
        onPrint={() => setIsPrintOpen(true)}
        onRunDemoPreset={handleRunDemoPreset}
        onOpenWeakestAirports={() => setIsWeakestOpen(true)}
        onOpenComparisonDetails={() => setIsComparisonOpen(true)}
      />

      {/* Main Workspace Body: Left (300px) | Centre | Right (360px) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Closures & Airport Impact */}
        <LeftPanel
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          airports={networkData.airports}
          closures={closures}
          onAddClosure={handleAddClosure}
          onRemoveClosure={handleRemoveClosure}
          onUpdateClosure={handleUpdateClosure}
          airportImpacts={currentResult.airports}
          totalNetworkDelay={currentResult.kpis.total_delay_minutes}
          selectedAirportId={selectedAirportId || hoveredAirportId || undefined}
          onSelectAirport={(id) => setSelectedAirportId(id === selectedAirportId ? undefined : id)}
          onHoverAirport={setHoveredAirportId}
        />

        {/* Center Panel: KPIs, Map, Delay Ribbon, Gantt, Time Scrubber */}
        <main className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3 min-w-0 bg-background relative">
          {/* First run empty state banner */}
          {showEmptyOverlay && closures.length === 0 && (
            <EmptyStateOverlay
              onDismiss={() => setShowEmptyOverlay(false)}
              onSelectBOM={() => {
                handleAddClosure({
                  id: 'bom_initial_90',
                  airport: 'BOM',
                  start_min: 840,
                  end_min: 930,
                });
                setShowEmptyOverlay(false);
              }}
            />
          )}

          {/* 5 KPI Cards Strip */}
          <KpiStrip
            kpis={currentResult.kpis}
            baselineKpis={viewMode !== 'baseline' ? baselineResult.kpis : undefined}
            activeFilter={activeKpiFilter}
            onSelectFilter={setActiveKpiFilter}
            reducedMotion={settings.reducedMotion}
          />

          {/* Interactive Network Map (SVG) */}
          <NetworkMap
            airports={networkData.airports}
            flights={currentResult.flights}
            closures={closures}
            airportImpacts={currentResult.airports}
            currentTimeMin={currentTimeMin}
            selectedAirportId={selectedAirportId}
            selectedFlightId={selectedFlightId}
            onSelectAirport={(id) => setSelectedAirportId(id === selectedAirportId ? undefined : id)}
            onSelectFlight={(id) => setSelectedFlightId(id)}
            onRequestCloseAirport={(apId) => {
              handleAddClosure({
                id: `closure_${apId}_${Date.now()}`,
                airport: apId,
                start_min: currentTimeMin,
                end_min: Math.min(1440, currentTimeMin + 90),
              });
            }}
            reducedMotion={settings.reducedMotion}
          />

          {/* Delay Ribbon: Breakdown by Root Cause */}
          <DelayRibbon
            delayByCause={currentResult.kpis.delay_by_cause}
            totalDelay={currentResult.kpis.total_delay_minutes}
          />

          {/* Aircraft Rotation Gantt (16 Chains + 2 Spares) */}
          <AircraftGantt
            flights={currentResult.flights}
            recoveredFlights={recoveredResult?.flights}
            closures={closures}
            crews={currentResult.crews}
            spares={networkData.spare_aircraft}
            currentTimeMin={currentTimeMin}
            selectedFlightId={selectedFlightId}
            onSelectFlight={(id) => setSelectedFlightId(id)}
            viewMode={viewMode}
            reducedMotion={settings.reducedMotion}
          />

          {/* Time Scrubber (00:00 - 24:00) */}
          <TimeScrubber
            currentTimeMin={currentTimeMin}
            onTimeChange={setCurrentTimeMin}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
            closures={closures}
            flights={currentResult.flights}
          />
        </main>

        {/* Right Panel: AI Dispatcher Recovery */}
        <RightPanel
          isCollapsed={isRightPanelCollapsed}
          onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
          closuresCount={closures.length}
          onRecommendRecovery={handleRecommendRecovery}
          isLoading={isEvaluatingAi}
          evaluatedActions={evaluatedActions}
          appliedAction={appliedAction}
          previewAction={previewAction}
          onPreviewAction={setPreviewAction}
          onApplyAction={handleApplyAction}
          onUndoAppliedAction={handleUndoAppliedAction}
          baseResult={disruptedResult}
          aiExplanation={aiExplanation}
        />

        {/* Flight Drawer (Slides over right panel on flight select) */}
        {selectedFlightObj && (
          <FlightDrawer
            flight={selectedFlightObj}
            onClose={() => setSelectedFlightId(undefined)}
            connections={currentResult.connections}
            crew={selectedCrewObj}
            onSimulateCancelFlight={(fId) => {
              handleApplyAction({
                id: `cancel_${fId}`,
                type: 'cancel_flight',
                title: `Cancel flight ${fId}`,
                description: `Emergency recovery cancellation of ${fId}`,
                flight_id: fId,
              });
            }}
            onSimulateSwapSpare={(f) => {
              const spare = networkData.spare_aircraft.find((s) => s.base === f.origin);
              if (spare) {
                handleApplyAction({
                  id: `swap_${spare.tail_id}_${f.tail_id}_leg${f.leg_order}`,
                  type: 'swap_spare',
                  title: `Swap spare ${spare.tail_id} onto ${f.tail_id} from leg ${f.leg_order}`,
                  description: `Take over ${f.tail_id} starting at ${f.flight_id}`,
                  spare_tail_id: spare.tail_id,
                  target_tail_id: f.tail_id,
                  from_leg_order: f.leg_order,
                });
              } else {
                alert(`No spare aircraft stationed at ${f.origin}. Spares are at BLR and DEL.`);
              }
            }}
            onJumpToFlight={(fId) => setSelectedFlightId(fId)}
            onJumpToAirport={(apId) => setSelectedAirportId(apId)}
          />
        )}
      </div>

      {/* Status Bar (28px) */}
      <StatusBar
        closures={closures}
        totalFlights={networkData.flights.length}
        delayedCount={currentResult.kpis.delayed_flights}
        cancelledCount={currentResult.kpis.cancelled_flights}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(up) => setSettings((s) => ({ ...s, ...up }))}
      />

      {/* Help Tour Modal */}
      <HelpTourModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Accessible Table View Modal */}
      <TableViewModal
        isOpen={isTableViewOpen}
        onClose={() => setIsTableViewOpen(false)}
        flights={currentResult.flights}
        onSelectFlight={(id) => setSelectedFlightId(id)}
      />

      {/* Weakest Airports Vulnerability Modal */}
      <WeakestAirportsModal
        isOpen={isWeakestOpen}
        onClose={() => setIsWeakestOpen(false)}
        networkData={networkData}
        onApplyClosure={handleAddClosure}
      />

      {/* Before / After Comparison Details Modal */}
      {recoveredResult && (
        <ComparisonDetailsModal
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          disruptedResult={disruptedResult}
          recoveredResult={recoveredResult}
          appliedAction={appliedAction}
        />
      )}

      {/* Printable 1-Page Incident & Recovery Briefing Modal */}
      <PrintSummaryModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        scenarioName={scenarioName}
        disruptedResult={disruptedResult}
        recoveredResult={recoveredResult}
        appliedAction={appliedAction}
      />
    </div>
  );
};

export default App;
