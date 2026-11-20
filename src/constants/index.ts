/**
 * Centralized Application and Engine Constants for Domino Sky.
 */

// Time & Schedule Constants (in minutes)
export const MINUTES_IN_DAY = 1440;
export const MIN_TURNAROUND_MINUTES = 30;
export const MIN_CONNECT_MINUTES = 45;
export const MAX_CREW_DUTY_MINUTES = 600;
export const CREW_AT_RISK_THRESHOLD_MINUTES = 30; // Within 30 mins of max duty
export const MAX_CREW_ITERATION_ROUNDS = 5;

// Default Simulation & Scenario Constants
export const DEFAULT_CLOSURE_DURATION_MINUTES = 90;
export const MAX_SIMULTANEOUS_CLOSURES = 3;
export const DEFAULT_START_TIME_MINUTES = 840; // 14:00 IST
export const DEFAULT_SEATS_PER_AIRCRAFT = 180;

// UI & Map Dimensions
export const MAP_SVG_WIDTH = 680;
export const MAP_SVG_HEIGHT = 700;
export const MIN_TOUCH_TARGET_SIZE_PX = 44;

// Playback Speeds
export const PLAYBACK_INTERVAL_MS = 250;
export const PLAYBACK_STEPS: Record<number, number> = {
  1: 2, // 2 minutes per tick (1x)
  2: 5, // 5 minutes per tick (2x)
  5: 15, // 15 minutes per tick (5x)
};

// Root Delay Cause Keys & Palette
export const DELAY_CAUSES = {
  CLOSURE_HOLD: 'closure_hold',
  AIRCRAFT_KNOCK_ON: 'aircraft_knock_on',
  CREW_LIMIT: 'crew_limit',
  NONE: 'none',
} as const;

export const STATUS_COLORS = {
  ON_TIME: '#10B981', // Emerald 500
  DELAYED: '#F59E0B', // Amber 500
  CANCELLED: '#EF4444', // Red 500
  CLOSURE: '#8B5CF6', // Purple 500
  SPARE: '#3B82F6', // Blue 500
  BACKGROUND: '#F7F8FA',
  CARD_BG: '#FFFFFF',
  BORDER: '#E2E8F0',
  TEXT_MAIN: '#0F172A',
  TEXT_MUTED: '#475569', // Meets WCAG AA 4.5:1 on white and light slate
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  TOGGLE_PLAY: 'Space',
  TIME_BACK: 'ArrowLeft',
  TIME_FORWARD: 'ArrowRight',
  DISMISS: 'Escape',
  RECOMMEND_RECOVERY: 'r',
  VIEW_BASELINE: '1',
  VIEW_DISRUPTED: '2',
  VIEW_RECOVERED: '3',
  UNDO: 'z',
} as const;
