import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { finisherQueries } from "../api";
import type { PomodoroSummary } from "../types";

/**
 * Pomodoro timing in the browser (FIN-039, ADR-0007). The server's start and
 * end instants are the truth; the browser only counts down. A shared
 * one-second ticker runs while any countdown is on screen, and the time left
 * is always computed from timestamps, so throttled background tabs, reloads
 * and other devices agree.
 */

// ---------------------------------------------------------------------------
// One shared one-second ticker
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let current = Date.now();

function notify() {
  current = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(notify, 1000);
    // Refresh at once so a countdown that just appeared doesn't show a stale time.
    queueMicrotask(notify);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const snapshot = () => current;

/** The device clock, updated once a second while mounted. */
export function useSecondTick(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Today's Pomodoro data from /api/finisher/basics, plus the difference between
 * the server's clock and this device's, measured when the data arrived.
 */
export function usePomodoro(): { summary: PomodoroSummary | undefined; offsetMs: number } {
  const { data, dataUpdatedAt } = useQuery(finisherQueries.basics());
  const summary = data?.pomodoro;
  const offsetMs = summary ? Date.parse(summary.serverNow) - dataUpdatedAt : 0;
  return { summary, offsetMs };
}

// ---------------------------------------------------------------------------
// Chime (decision 25): Web Audio tones, no audio file, no CSP change
// ---------------------------------------------------------------------------

let audio: AudioContext | null = null;

/**
 * Browsers only allow sound after a user gesture: call this from the Start
 * click so the chime can play 25 minutes later. After a reload with no click
 * since, the chime may stay silent; the message still shows.
 */
export function unlockChime(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

/** A short, soft two-note chime. Silent when sound isn't allowed. */
export function playChime(): void {
  if (!audio || audio.state !== "running") return;
  const ctx = audio;
  [880, 1318.5].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + index * 0.18;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.65);
  });
}

/** Sessions whose completion was already shown, so two watchers or a remount never repeat it. */
export const announcedCompletions = new Set<string>();
