/**
 * Pomodoro sessions (FIN-039, FIN-040, ADR-0007). A session lasts a fixed 25
 * minutes; the server stores its start and end, and the browser only counts
 * down from those instants.
 */
export const POMODORO_MINUTES = 25;

/** Milliseconds left until `endsAt` at the given time (never negative). */
export function remainingMs(endsAt: string, nowMs: number): number {
  return Math.max(0, Date.parse(endsAt) - nowMs);
}

/** "24:59": whole seconds rounded up, so "00:00" appears only at the end. */
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Share of the session that has passed, from 0 to 1. */
export function pomodoroProgress(startedAt: string, endsAt: string, nowMs: number): number {
  const start = Date.parse(startedAt);
  const total = Date.parse(endsAt) - start;
  if (!(total > 0)) return 1;
  return Math.min(1, Math.max(0, (nowMs - start) / total));
}

/** The Today tab's summary wording (FIN-040). */
export function formatPomodoroSummary(completed: number, minutes: number): string {
  if (completed === 0) return "No Pomodoros yet today";
  return `${completed} ${completed === 1 ? "Pomodoro" : "Pomodoros"} today · ${minutes} min`;
}

/**
 * The rest suggested when a session completes (FIN-039). A suggestion only:
 * there is no break timer. Every fourth session today earns a longer break.
 */
export function breakSuggestion(completedToday: number): { long: boolean; text: string } {
  if (completedToday > 0 && completedToday % 4 === 0) {
    return { long: true, text: "That’s four in a row. Take a longer break, 15 to 30 minutes, before the next one." };
  }
  return { long: false, text: "Take a 5-minute break: stand up, stretch, get some water and rest your eyes." };
}
