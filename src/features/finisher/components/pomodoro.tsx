import { useNavigate } from "@tanstack/react-router";
import { CircleCheckIcon, TimerIcon } from "lucide-react";
import { useEffect, useEffectEvent, useId, useState } from "react";
import { Link } from "@/components/link";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { finisherApi } from "../api";
import { breakSuggestion, formatCountdown, pomodoroProgress, POMODORO_MINUTES, remainingMs } from "../domain/pomodoro";
import { generalErrorMessage } from "../messages";
import type { PomodoroActive, TaskDetail } from "../types";
import { announcedCompletions, playChime, unlockChime, usePomodoro, useSecondTick } from "./pomodoro-clock";
import { isPlainClick } from "./task-panel-context";
import { useFinisherRefresh } from "./use-refresh";

/** Time left, counting down from the server's end instant. */
function Countdown({ active, offsetMs, size }: { active: PomodoroActive; offsetMs: number; size: "focus" | "inline" }) {
  const now = useSecondTick() + offsetMs;
  const left = formatCountdown(remainingMs(active.endsAt, now));
  if (size === "inline") return <span className="font-mono tabular-nums">{left}</span>;
  const progress = pomodoroProgress(active.startedAt, active.endsAt, now);
  return (
    <>
      {/* role="timer" is not live: the time is not announced every second. */}
      <p role="timer" className="text-center font-mono text-6xl tabular-nums sm:text-7xl">
        <span className="sr-only">Time left: </span>
        {left}
      </p>
      <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  );
}

/**
 * FIN-039: the Pomodoro block in a task's details (side panel and task page).
 * Start on an Open task. While a session runs, the focus popup covers the
 * page (PomodoroFocusDialog), so the block only says so. The counts are
 * completed sessions (FIN-040).
 */
export function PomodoroBlock({ task }: { task: TaskDetail }) {
  const headingId = useId();
  const { summary, offsetMs } = usePomodoro();
  const refresh = useFinisherRefresh();
  const [busy, setBusy] = useState(false);
  const active = summary?.active ?? null;

  async function start() {
    unlockChime(); // a user gesture: lets the chime play when the session ends
    setBusy(true);
    const result = await finisherApi<{ id: string }>("POST", `/api/finisher/tasks/${task.id}/pomodoros`, {});
    setBusy(false);
    if (!result.ok) {
      const running = result.error === "not_allowed";
      toast.add({
        title: running ? "A Pomodoro is already running" : "Couldn’t start the Pomodoro",
        description: running ? "It may have been started on another device." : generalErrorMessage(result.error),
        type: "error",
      });
    }
    // On success the refreshed summary opens the focus popup, which takes the focus.
    await refresh();
  }

  return (
    <section aria-labelledby={headingId} className="mt-5 border-t pt-4">
      <h3 id={headingId} className="text-sm font-medium">
        Pomodoro
      </h3>
      {!summary ? null : active ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {active.taskId === task.id ? "Running" : `Running for “${active.taskTitle ?? "another task"}”`}:{" "}
          <Countdown active={active} offsetMs={offsetMs} size="inline" /> left.
        </p>
      ) : task.status === "open" ? (
        <Button data-pomodoro-start className="mt-2 h-11 px-4" disabled={busy} onClick={() => void start()}>
          {busy ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <TimerIcon data-icon="inline-start" />}
          Start Pomodoro · {POMODORO_MINUTES} min
        </Button>
      ) : null}
      <p className="mt-3 font-mono text-[0.8125rem] text-muted-foreground">
        Pomodoros: {task.pomodoros.today} today · {task.pomodoros.total} total
      </p>
    </section>
  );
}

/**
 * FIN-040 in the Finisher header: today's completed count and, while a
 * session runs, a countdown chip that opens its task (the side panel on
 * laptop, the task page on phone). Left out while loading.
 */
export function PomodoroHeader() {
  const { summary, offsetMs } = usePomodoro();
  const desktop = !useIsMobile();
  const navigate = useNavigate();
  if (!summary) return null;
  const { active, today } = summary;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 font-mono text-xs text-muted-foreground">
        <TimerIcon aria-hidden="true" className="size-3.5" />
        {today.completed}
        <span className="sr-only"> {today.completed === 1 ? "Pomodoro" : "Pomodoros"} completed today</span>
      </span>
      {active ? (
        active.taskId ? (
          <Link
            to="/finisher/tasks/$id"
            params={{ id: active.taskId }}
            onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
              if (!desktop || !isPlainClick(event)) return;
              event.preventDefault();
              // Opens the side panel on the current Finisher page (FIN-036).
              void navigate({ to: ".", search: (previous: Record<string, unknown>) => ({ ...previous, task: active.taskId }) } as never);
            }}
            className="inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full border border-primary/60 bg-card px-3 text-sm hover:bg-accent hover:text-accent-foreground sm:min-h-8"
          >
            <span aria-hidden="true" className="size-2 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            <Countdown active={active} offsetMs={offsetMs} size="inline" />
            <span className="sr-only"> left on the Pomodoro for</span>
            <span className="min-w-0 truncate">{active.taskTitle}</span>
          </Link>
        ) : (
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-primary/60 bg-card px-3 text-sm">
            <Countdown active={active} offsetMs={offsetMs} size="inline" />
          </span>
        )
      ) : null}
    </div>
  );
}

/** A session that just completed, kept after the refresh clears it from the summary. */
type Completed = { id: string; taskId: string | null; taskTitle: string | null; todayBefore: number };

/**
 * The Pomodoro popups, mounted once for every signed-in page (FIN-039):
 * - while a session runs, the focus popup covers the app, also after a
 *   reload or when the session was started on another device;
 * - when it ends, a chime, fresh counts and the completion popup, which
 *   suggests a break and offers "Mark task done". The end writes nothing: the
 *   server already treats the session as completed once its time is up
 *   (ADR-0007).
 */
export function PomodoroWatcher() {
  const { summary, offsetMs } = usePomodoro();
  const [completed, setCompleted] = useState<Completed | null>(null);
  const active = summary?.active ?? null;
  return (
    <>
      {active ? (
        <>
          <CompletionTimer
            key={active.id}
            active={active}
            offsetMs={offsetMs}
            onComplete={() =>
              setCompleted({
                id: active.id,
                taskId: active.taskId,
                taskTitle: active.taskTitle,
                todayBefore: summary?.today.completed ?? 0,
              })
            }
          />
          {/* Gone once the time is up, before the refresh clears the session. */}
          <PomodoroFocusDialog
            key={active.id}
            active={active}
            offsetMs={offsetMs}
            ended={completed?.id === active.id || announcedCompletions.has(active.id)}
          />
        </>
      ) : null}
      <PomodoroCompleteDialog
        completed={completed}
        // The refreshed count includes this session; until it arrives, add it ourselves.
        completedToday={Math.max(summary?.today.completed ?? 0, (completed?.todayBefore ?? 0) + 1)}
        onClose={() => setCompleted(null)}
      />
    </>
  );
}

function CompletionTimer({ active, offsetMs, onComplete }: { active: PomodoroActive; offsetMs: number; onComplete: () => void }) {
  const refresh = useFinisherRefresh();
  const report = useEffectEvent(onComplete);
  useEffect(() => {
    const delay = Math.max(0, Date.parse(active.endsAt) - (Date.now() + offsetMs)) + 250;
    const handle = setTimeout(() => {
      if (announcedCompletions.has(active.id)) return;
      announcedCompletions.add(active.id);
      playChime();
      report();
      void refresh();
    }, delay);
    return () => clearTimeout(handle);
  }, [active, offsetMs, refresh]);
  return null;
}

/** Prefixes the browser tab title while `on`, so a background tab shows it too. */
function useTitlePrefix(prefix: string, on: boolean) {
  useEffect(() => {
    if (!on) return;
    const previous = document.title;
    document.title = prefix + previous;
    return () => {
      if (document.title.startsWith(prefix)) document.title = previous;
    };
  }, [prefix, on]);
}

/**
 * The focus popup while a session runs (FIN-039, decision 28). It blocks the
 * whole app on purpose: the only ways out are Stop and Mark task done, each
 * confirmed, and neither counts the session. Escape and outside clicks do
 * nothing.
 */
function PomodoroFocusDialog({ active, offsetMs, ended }: { active: PomodoroActive; offsetMs: number; ended: boolean }) {
  const refresh = useFinisherRefresh();
  const [confirm, setConfirm] = useState<"stop" | "done" | null>(null);
  const [busy, setBusy] = useState(false);
  const open = !ended;
  const title = active.taskTitle ?? "your task";
  useTitlePrefix("⏱ Focus · ", open);

  /** Ends the session early; false when that failed and nothing changed. */
  async function stopSession(): Promise<boolean> {
    const result = await finisherApi("POST", `/api/finisher/pomodoros/${active.id}/stop`, {});
    if (result.ok) return true;
    if (result.error === "not_allowed") {
      // The 25 minutes had already passed: it counts (FIN-039).
      toast.add({ title: "This Pomodoro had already finished. It counted.", type: "success" });
      return true;
    }
    toast.add({ title: "Couldn’t stop the Pomodoro", description: generalErrorMessage(result.error), type: "error" });
    return false;
  }

  async function run() {
    const action = confirm;
    setBusy(true);
    const stopped = await stopSession();
    if (stopped && action === "done" && active.taskId) await markDone(active.taskId, refresh);
    else if (stopped) toast.add({ title: "Pomodoro stopped. It wasn’t counted." });
    setBusy(false);
    setConfirm(null);
    await refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={() => undefined}>
      <AlertDialogContent
        overlayClassName="bg-black/60 supports-backdrop-filter:backdrop-blur-sm"
        className="max-w-[calc(100vw-2rem)]! gap-6 p-6 sm:max-w-md! sm:p-8"
      >
        <AlertDialogHeader className="place-items-center! text-center!">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <TimerIcon aria-hidden="true" className="size-4" />
            Focus
          </p>
          <AlertDialogTitle className="text-2xl text-balance wrap-break-word">{title}</AlertDialogTitle>
          <AlertDialogDescription>Stay with this one task. Everything else can wait.</AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Countdown active={active} offsetMs={offsetMs} size="focus" />
        </div>
        <AlertDialogFooter className="sm:justify-center">
          <Button variant="outline" className="h-11" disabled={busy} onClick={() => setConfirm("stop")}>
            Stop
          </Button>
          {active.taskId ? (
            <Button variant="outline" className="h-11" disabled={busy} onClick={() => setConfirm("done")}>
              Mark task done
            </Button>
          ) : null}
        </AlertDialogFooter>

        <AlertDialog open={confirm !== null} onOpenChange={(next) => (next ? undefined : setConfirm(null))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm === "done" ? "Mark the task done and end the Pomodoro?" : "Stop this Pomodoro?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirm === "done"
                  ? `“${title}” will be marked done. This session won’t count: only full sessions do.`
                  : "It won’t be counted."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {/* First in the footer, so it gets the initial focus: Enter never abandons a session by accident. */}
              <AlertDialogCancel className="h-11">Keep going</AlertDialogCancel>
              <Button className="h-11" disabled={busy} onClick={() => void run()}>
                {busy ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {confirm === "done" ? "Mark done" : "Stop Pomodoro"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The completion popup. Modal on purpose: the user closes it before going on,
 * so the end of a session is not missed. "Take a break" is first in the
 * footer and gets the initial focus, so Enter only closes it.
 */
function PomodoroCompleteDialog({
  completed,
  completedToday,
  onClose,
}: {
  completed: Completed | null;
  completedToday: number;
  onClose: () => void;
}) {
  const refresh = useFinisherRefresh();
  const [busy, setBusy] = useState(false);
  const open = completed !== null;
  const rest = breakSuggestion(completedToday);

  useTitlePrefix("✓ Pomodoro complete · ", open);

  async function done(taskId: string) {
    setBusy(true);
    await markDone(taskId, refresh);
    setBusy(false);
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary">
            <CircleCheckIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Pomodoro complete</AlertDialogTitle>
          <AlertDialogDescription>
            You focused on “{completed?.taskTitle ?? "your task"}” for {POMODORO_MINUTES} minutes. That’s {completedToday}{" "}
            {completedToday === 1 ? "Pomodoro" : "Pomodoros"} today.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">{rest.text}</p>
        <AlertDialogFooter>
          <AlertDialogCancel variant="default" className="h-11">
            Take a break
          </AlertDialogCancel>
          {completed?.taskId ? (
            <Button variant="outline" className="h-11" disabled={busy} onClick={() => void done(completed.taskId!)}>
              {busy ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              Mark task done
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

async function markDone(taskId: string, refresh: () => Promise<unknown>) {
  const result = await finisherApi("POST", `/api/finisher/tasks/${taskId}/actions`, { action: "done" });
  if (!result.ok) {
    toast.add({
      title: result.error === "not_allowed" ? "This task is already closed" : "Couldn’t update the task",
      description: result.error === "not_allowed" ? undefined : generalErrorMessage(result.error),
      type: "error",
    });
    return;
  }
  toast.add({ title: "Task marked done", type: "success" });
  void refresh();
}
