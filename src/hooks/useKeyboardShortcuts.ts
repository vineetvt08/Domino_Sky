import { useEffect } from 'react';
import { AirportClosure, RecoveryAction } from '../types/engine';

interface KeyboardShortcutsOptions {
  closures: AirportClosure[];
  isAiLoading: boolean;
  appliedAction: RecoveryAction | null;
  history: AirportClosure[][];
  historyIndex: number;
  onTogglePlay: () => void;
  onStepTime: (deltaMinutes: number) => void;
  onDismissModals: () => void;
  onRecommendRecovery: () => void;
  onSetViewMode: (mode: 'baseline' | 'disrupted' | 'recovered') => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useKeyboardShortcuts({
  closures,
  isAiLoading,
  appliedAction,
  history,
  historyIndex,
  onTogglePlay,
  onStepTime,
  onDismissModals,
  onRecommendRecovery,
  onSetViewMode,
  onUndo,
  onRedo,
}: KeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore key events when typing into input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onTogglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          onStepTime(e.shiftKey ? -60 : -15);
          break;

        case 'ArrowRight':
          e.preventDefault();
          onStepTime(e.shiftKey ? 60 : 15);
          break;

        case 'Escape':
          onDismissModals();
          break;

        default:
          if (e.key === 'r' || e.key === 'R') {
            if (closures.length > 0 && !isAiLoading) {
              onRecommendRecovery();
            }
          } else if (e.key === '1') {
            onSetViewMode('baseline');
          } else if (e.key === '2') {
            onSetViewMode('disrupted');
          } else if (e.key === '3') {
            if (appliedAction) {
              onSetViewMode('recovered');
            }
          } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (e.shiftKey) {
              if (historyIndex < history.length - 1) {
                onRedo();
              }
            } else {
              if (historyIndex >= 0) {
                onUndo();
              }
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    closures,
    isAiLoading,
    appliedAction,
    history,
    historyIndex,
    onTogglePlay,
    onStepTime,
    onDismissModals,
    onRecommendRecovery,
    onSetViewMode,
    onUndo,
    onRedo,
  ]);
}
