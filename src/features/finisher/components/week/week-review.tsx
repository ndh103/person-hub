import { useBlocker } from "@tanstack/react-router";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { browserTimeZone, finisherApi } from "../../api";
import { DEFAULT_TIME_ZONE, formatDuration, formatWeekdayDate, startOfNextWeek, zonedNow, type LocalDate } from "../../domain/dates";
import { POMODORO_MINUTES } from "../../domain/pomodoro";
import { formatWeekDetails, formatWeekRate } from "../../domain/schedule";
import { LIMITS } from "../../domain/validation";
import { formatDayShort, timeAfterMove } from "../../domain/week";
import { generalErrorMessage } from "../../messages";
import type { TaskItem, WeekReviewData } from "../../types";
import { EmptyState } from "../list-parts";
import { useFinisherRefresh } from "../use-refresh";
import { MoveToDayDialog } from "./plan-dialogs";

const CARD = "rounded-2xl border bg-card p-4 text-card-foreground sm:p-5";

function browserNow() {
  return zonedNow(browserTimeZone() ?? DEFAULT_TIME_ZONE);
}

function Chip({ count, children }: { count: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="rounded-full border bg-card px-3 py-1">
      <span className="font-semibold">{count}</span> {children}
    </li>
  );
}

/**
 * FIN-047: a look back at the current or a past week, leading into the next
 * one. Counts only, no success percentage (A6). The only thing it saves is the
 * weekly note (decision 37); slipped tasks can be moved from here.
 */
export function WeekReview({ data, onPlanNext, onShowPlan }: { data: WeekReviewData; onPlanNext: () => void; onShowPlan: () => void }) {
  const delegated = data.done.filter((task) => task.status === "delegated").length;
  const sessions = data.projects.reduce((sum, project) => ({ done: sum.done + project.week.done, scheduled: sum.scheduled + project.week.scheduled }), {
    done: 0,
    scheduled: 0,
  });
  const pomodoros = data.pomodoros.reduce((sum, day) => sum + day.completed, 0);
  const nothing = !data.done.length && !data.letGo.length && !data.slipped.length && !sessions.scheduled && !pomodoros;

  if (nothing) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState title="Nothing happened in Finisher this week" description="No tasks were finished or due, no sessions were scheduled, and no Pomodoros were completed.">
          <Button variant="outline" className="h-11" onClick={onShowPlan}>
            Open the Plan view
          </Button>
        </EmptyState>
        <WeeklyNote key={data.weekStart} weekStart={data.weekStart} saved={data.note} />
      </div>
    );
  }

  const byDay = new Map<LocalDate, typeof data.done>();
  for (const task of data.done) byDay.set(task.closedOn, [...(byDay.get(task.closedOn) ?? []), task]);

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="Week summary" className="flex flex-wrap gap-2 text-sm">
        <Chip count={data.done.length - delegated}>done</Chip>
        <Chip count={delegated}>delegated</Chip>
        <Chip count={data.letGo.length}>let go</Chip>
        <Chip count={data.slipped.length}>slipped</Chip>
        <li className="rounded-full border bg-card px-3 py-1">
          {sessions.scheduled ? (
            <>
              Sessions{" "}
              <span className="font-semibold">
                {sessions.done} of {sessions.scheduled}
              </span>{" "}
              done
            </>
          ) : (
            "No sessions scheduled"
          )}
        </li>
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Slipped tasks={data.slipped} weekStart={data.weekStart} />

        <section aria-labelledby="review-done" className={CARD}>
          <h3 id="review-done" className="font-heading text-lg font-medium">
            Done this week <span className="font-mono text-xs text-muted-foreground">{data.done.length}</span>
          </h3>
          {data.done.length ? (
            [...byDay.entries()].map(([date, tasks]) => (
              <div key={date}>
                <h4 className="mt-3 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">{formatDayShort(date)}</h4>
                <ul className="mt-1 flex flex-col gap-1">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2 text-sm">
                      <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 break-words">
                        {task.title}
                        {task.status === "delegated" ? (
                          <Badge variant="outline" className="ml-2">
                            Delegated{task.note ? ` to ${task.note}` : ""}
                          </Badge>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No tasks finished this week.</p>
          )}
        </section>

        <section aria-labelledby="review-projects" className={CARD}>
          <h3 id="review-projects" className="font-heading text-lg font-medium">
            Projects
          </h3>
          {data.projects.length ? (
            <ul className="mt-2 divide-y">
              {data.projects.map((project) => (
                <li key={project.id} className="py-2">
                  <p className="text-sm font-medium break-words">{project.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatWeekRate(project.week, "")} · {formatWeekDetails(project.week)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No sessions scheduled.</p>
          )}
        </section>

        <section aria-labelledby="review-pomodoros" className={CARD}>
          <h3 id="review-pomodoros" className="font-heading text-lg font-medium">
            Pomodoros by day
          </h3>
          <ul className="mt-2 divide-y">
            {data.pomodoros.map((day) => {
              const future = day.date > data.now.date;
              return (
                <li key={day.date} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                  <span className={cn(day.date === data.now.date && "font-semibold")}>
                    {formatDayShort(day.date)}
                    {day.date === data.now.date ? " · Today" : ""}
                  </span>
                  {future ? (
                    <span className="font-mono text-muted-foreground">
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">not yet</span>
                    </span>
                  ) : (
                    <span className="font-mono">
                      <span className="font-semibold">{day.completed}</span>{" "}
                      <span className="text-muted-foreground">
                        {day.completed === 1 ? "Pomodoro" : "Pomodoros"} · {day.completed * POMODORO_MINUTES} min
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 border-t pt-2 font-mono text-[0.8125rem]">
            <span className="font-semibold">{pomodoros}</span> {pomodoros === 1 ? "Pomodoro" : "Pomodoros"} this week ·{" "}
            {formatDuration(pomodoros * POMODORO_MINUTES)}
          </p>
        </section>

        <WeeklyNote key={data.weekStart} weekStart={data.weekStart} saved={data.note} />

        <section aria-labelledby="review-letgo" className={CARD}>
          <h3 id="review-letgo" className="font-heading text-lg font-medium">
            Let go this week <span className="font-mono text-xs text-muted-foreground">{data.letGo.length}</span>
          </h3>
          {data.letGo.length ? (
            <details className="mt-1">
              <summary className="min-h-11 cursor-pointer content-center text-sm text-muted-foreground">Show what was let go</summary>
              <ul className="flex flex-col gap-2">
                {data.letGo.map((task) => (
                  <li key={task.id} className="text-sm">
                    <p className="font-medium break-words">{task.title}</p>
                    {task.note ? <p className="break-words text-muted-foreground">{task.note}</p> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Nothing let go.</p>
          )}
        </section>
      </div>

      <div>
        <Button className="h-11 px-4" onClick={onPlanNext}>
          Plan next week
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

/** Slipped tasks with Move to day…, Next week, and Move all to next week (FIN-047). */
function Slipped({ tasks, weekStart }: { tasks: TaskItem[]; weekStart: LocalDate }) {
  const refresh = useFinisherRefresh();
  const [moveFor, setMoveFor] = useState<TaskItem | null>(null);
  const [busy, setBusy] = useState(false);

  async function moveOne(task: TaskItem, date: LocalDate | null) {
    const dueTime = timeAfterMove(task, date, browserNow());
    const result = await finisherApi("PUT", `/api/finisher/tasks/${task.id}/due`, { dueDate: date, dueTime });
    if (!result.ok) {
      toast.add({ title: `Couldn’t move “${task.title}”`, description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    toast.add({ title: date ? `Moved to ${formatWeekdayDate(date)}` : "Moved to Unplanned", type: "success" });
    await refresh();
  }

  async function moveAll() {
    const date = startOfNextWeek(browserNow().date);
    const now = browserNow();
    setBusy(true);
    const changes = tasks.map((task) => ({ id: task.id, dueDate: date, dueTime: timeAfterMove(task, date, now) }));
    const result = await finisherApi<{ moved: string[]; failed: string[] }>("POST", "/api/finisher/tasks/due-changes", { changes });
    setBusy(false);
    if (!result.ok) {
      toast.add({ title: "Couldn’t move the tasks", description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    const moved = new Set(result.data.moved);
    const back = tasks.filter((task) => moved.has(task.id)).map((task) => ({ id: task.id, dueDate: task.dueDate, dueTime: task.dueTime }));
    const failed = changes.length - moved.size;
    toast.add({
      title: `${moved.size} ${moved.size === 1 ? "task" : "tasks"} moved to next week (${formatWeekdayDate(date)})`,
      description: failed ? `${failed} couldn’t be moved and stayed where ${failed === 1 ? "it was" : "they were"}.` : undefined,
      type: failed ? "warning" : "success",
      actionProps: back.length
        ? {
            children: "Undo",
            onClick: () =>
              void finisherApi("POST", "/api/finisher/tasks/due-changes", { changes: back }).then((undo) => {
                if (!undo.ok) toast.add({ title: "Couldn’t undo the move", description: generalErrorMessage(undo.error), type: "error" });
                return refresh();
              }),
          }
        : undefined,
    });
    await refresh();
  }

  return (
    <section aria-labelledby="review-slipped" className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="review-slipped" className="font-heading text-lg font-medium">
          Slipped <span className="font-mono text-xs text-muted-foreground">{tasks.length}</span>
        </h3>
        {tasks.length ? (
          <Button variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void moveAll()}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Move all to next week
          </Button>
        ) : null}
      </div>
      {tasks.length ? (
        <ul className="mt-2 divide-y">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-sm font-medium break-words">{task.title}</p>
                {task.dueDate ? (
                  <p className="font-mono text-xs text-destructive">
                    Was due {formatDayShort(task.dueDate)}
                    {task.dueTime ? ` ${task.dueTime}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" className="h-11 px-3 text-accent-foreground sm:h-9" onClick={() => setMoveFor(task)}>
                  Move to day…
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 px-3 text-accent-foreground sm:h-9"
                  aria-label={`Move “${task.title}” to next week`}
                  onClick={() => void moveOne(task, startOfNextWeek(browserNow().date))}
                >
                  Next week
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nothing slipped this week.</p>
      )}
      {moveFor ? (
        <MoveToDayDialog
          key={moveFor.id}
          task={moveFor}
          weekStart={weekStart}
          onOpenChange={(open) => !open && setMoveFor(null)}
          onChoose={(date) => {
            const task = moveFor;
            setMoveFor(null);
            void moveOne(task, date);
          }}
        />
      ) : null}
    </section>
  );
}

/**
 * Decision 37: one plain-text note per week. Save is enabled once the text
 * changed; an empty note removes it. Leaving with unsaved text asks first.
 */
function WeeklyNote({ weekStart, saved }: { weekStart: LocalDate; saved: string | null }) {
  const refresh = useFinisherRefresh();
  const [text, setText] = useState(saved ?? "");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = text.trim() !== (saved ?? "");
  const length = [...text.trim()].length;
  const tooLong = length > LIMITS.weeklyNote;

  const blocker = useBlocker({ shouldBlockFn: () => dirty, enableBeforeUnload: () => dirty, withResolver: true });

  async function save() {
    if (pending || tooLong) return;
    setPending(true);
    setError(null);
    setStatus("Saving…");
    const result = await finisherApi("PUT", `/api/finisher/weekly-notes/${weekStart}`, { note: text });
    setPending(false);
    if (!result.ok) {
      setStatus("");
      setError(result.error === "validation" ? "The note can be at most 2000 characters." : `${generalErrorMessage(result.error)} Your text is still here.`);
      return;
    }
    setStatus(text.trim() ? "Saved" : "Note removed");
    // Refetch so the saved note becomes the new baseline for "unsaved changes".
    void refresh();
  }

  return (
    <section aria-labelledby="review-note-label" className={CARD}>
      <Label id="review-note-label" htmlFor="review-note" className="font-heading text-lg font-medium">
        Notes on this week
      </Label>
      <p id="review-note-hint" className="text-sm text-muted-foreground">
        What went well, and what to change next week.
      </p>
      <Textarea
        id="review-note"
        className="mt-2 min-h-32"
        value={text}
        aria-describedby="review-note-hint review-note-count"
        aria-invalid={tooLong || error ? true : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setStatus("");
          setError(null);
        }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p id="review-note-count" className={cn("font-mono text-xs text-muted-foreground", tooLong && "text-destructive")}>
          {length} / {LIMITS.weeklyNote}
        </p>
        <div className="flex items-center gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {status}
          </p>
          <Button className="h-11 sm:h-10" disabled={!dirty || pending || tooLong} onClick={() => void save()}>
            {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Save note
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <AlertDialog open={blocker.status === "blocked"} onOpenChange={(open) => !open && blocker.reset?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes to this week’s note?</AlertDialogTitle>
            <AlertDialogDescription>The note hasn’t been saved. If you leave, your changes are lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keep editing comes first, so it gets the initial focus. */}
            <AlertDialogCancel className="h-11">Keep editing</AlertDialogCancel>
            <Button variant="destructive" className="h-11" onClick={() => blocker.proceed?.()}>
              Discard changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
