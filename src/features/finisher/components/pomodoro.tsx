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
function Countdown({ active, offsetMs, size }: { active: PomodoroActive; offsetMs: number; size: "large" | "inline" }) {
  const now = useSecondTick() + offsetMs;
  const left = formatCountdown(remainingMs(active.endsAt, now));
  if (size === "inline") return <span className="font-mono tabular-nums">{left}</span>;
  const progress = pomodoroProgress(active.startedAt, active.endsAt, now);
  return (
    <>
      {/* role="timer" is not live: the time is not announced every second. */}
      <p role="timer" className="mt-1 font-mono text-4xl tabular-nums">
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
 * Start on an Open task; while running, a countdown and Stop; while another
 * task's session runs, Switch. The counts are completed sessions (FIN-040).
 */
export function PomodoroBlock({ task }: { task: TaskDetail }) {
  const headingId = useId();
  const { summary, offsetMs } = usePomodoro();
  const refresh = useFinisherRefresh();
  const [dialog, setDialog] = useState<"stop" | "switch" | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const active = summary?.active ?? null;
  const mine = active !== null && active.taskId === task.id;

  async function start(replace: boolean) {
    unlockChime(); // a user gesture: lets the chime play when the session ends
    setBusy(true);
    const result = await finisherApi<{ id: string }>("POST", `/api/finisher/tasks/${task.id}/pomodoros`, replace ? { replace: true } : {});
    setBusy(false);
    setDialog(null);
    if (!result.ok) {
      const running = result.error === "not_allowed";
      toast.add({
        title: running ? "A Pomodoro is already running" : "Couldn’t start the Pomodoro",
        description: running ? "It may have been started on another device." : generalErrorMessage(result.error),
        type: "error",
      });
      void refresh();
      return;
    }
    setAnnouncement(`Pomodoro started for “${task.title}”. ${POMODORO_MINUTES} minutes.`);
    await refresh();
    document.querySelector<HTMLElement>("[data-pomodoro-stop]")?.focus();
  }

  async function stop() {
    if (!active) return;
    setBusy(true);
    const result = await finisherApi("POST", `/api/finisher/pomodoros/${active.id}/stop`, {});
    setBusy(false);
    setDialog(null);
    if (result.ok) {
      setAnnouncement("Pomodoro stopped. It wasn’t counted.");
      toast.add({ title: "Pomodoro stopped. It wasn’t counted." });
    } else if (result.error === "not_allowed") {
      // The 25 minutes had already passed: it counts (FIN-039).
      toast.add({ title: "This Pomodoro had already finished. It counted.", type: "success" });
    } else {
      toast.add({ title: "Couldn’t stop the Pomodoro", description: generalErrorMessage(result.error), type: "error" });
    }
    await refresh();
    document.querySelector<HTMLElement>("[data-pomodoro-start]")?.focus();
  }

  return (
    <section aria-labelledby={headingId} className="mt-5 border-t pt-4">
      <h3 id={headingId} className="text-sm font-medium">
        Pomodoro
      </h3>
      {!summary ? null : mine && active ? (
        <>
          <Countdown active={active} offsetMs={offsetMs} size="large" />
          <Button data-pomodoro-stop variant="outline" className="mt-3 h-11" disabled={busy} onClick={() => setDialog("stop")}>
            Stop
          </Button>
        </>
      ) : active ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            A Pomodoro is running for “{active.taskTitle ?? "another task"}”: <Countdown active={active} offsetMs={offsetMs} size="inline" /> left.
          </p>
          {task.status === "open" ? (
            <Button variant="outline" className="mt-3 h-11" disabled={busy} onClick={() => setDialog("switch")}>
              Switch to this task
            </Button>
          ) : null}
        </>
      ) : task.status === "open" ? (
        <Button data-pomodoro-start className="mt-2 h-11 px-4" disabled={busy} onClick={() => void start(false)}>
          {busy ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <TimerIcon data-icon="inline-start" />}
          Start Pomodoro · {POMODORO_MINUTES} min
        </Button>
      ) : null}
      <p className="mt-3 font-mono text-[0.8125rem] text-muted-foreground">
        Pomodoros: {task.pomodoros.today} today · {task.pomodoros.total} total
      </p>
      <p className="sr-only" role="status">
        {announcement}
      </p>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => (open ? undefined : setDialog(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === "switch" ? "Switch to this task?" : "Stop this Pomodoro?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "switch"
                ? `Stop the Pomodoro for “${active?.taskTitle ?? "another task"}” and start one for “${task.title}”? The stopped session won’t count.`
                : "It won’t be counted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* First in the footer, so it gets the initial focus: Enter never abandons a session by accident. */}
            <AlertDialogCancel className="h-11">Keep going</AlertDialogCancel>
            <Button className="h-11" disabled={busy} onClick={() => void (dialog === "switch" ? start(true) : stop())}>
              {busy ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {dialog === "switch" ? "Stop and start" : "Stop Pomodoro"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
type Completed = { taskId: string | null; taskTitle: string | null; todayBefore: number };

/**
 * Shows the end of a session while the app is open (FIN-039): a modal popup
 * that suggests a break and offers "Mark task done", a chime, and fresh
 * counts. It writes nothing: the server already treats the session as
 * completed once its time is up (ADR-0007).
 */
export function PomodoroWatcher() {
  const { summary, offsetMs } = usePomodoro();
  const [completed, setCompleted] = useState<Completed | null>(null);
  const active = summary?.active ?? null;
  return (
    <>
      {active ? (
        <CompletionTimer
          key={active.id}
          active={active}
          offsetMs={offsetMs}
          onComplete={() =>
            setCompleted({ taskId: active.taskId, taskTitle: active.taskTitle, todayBefore: summary?.today.completed ?? 0 })
          }
        />
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

const COMPLETE_TITLE_PREFIX = "✓ Pomodoro complete · ";

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

  // Marks the browser tab too, for when the app is in a background tab.
  useEffect(() => {
    if (!open) return;
    const previous = document.title;
    document.title = COMPLETE_TITLE_PREFIX + previous;
    return () => {
      if (document.title.startsWith(COMPLETE_TITLE_PREFIX)) document.title = previous;
    };
  }, [open]);

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
