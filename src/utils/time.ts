/**
 * Time utility functions for Domino Sky (IST, 24h HH:MM)
 */

export function parseHHMM(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatHHMM(minutesFromMidnight: number): string {
  const normalized = Math.max(0, Math.floor(minutesFromMidnight));
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const mins = Math.max(0, Math.round(minutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatMinutesWithSign(minutes: number): string {
  if (minutes > 0) return `+${minutes}m`;
  if (minutes < 0) return `${minutes}m`;
  return '0m';
}
