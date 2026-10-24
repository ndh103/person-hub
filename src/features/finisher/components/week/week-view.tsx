import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { browserTimeZone, finisherQueries } from "../../api";
import { addDays, DEFAULT_TIME_ZONE, formatWeekdayDate, startOfWeek, zonedNow, type LocalDate } from "../../domain/dates";
import { formatWeekRange, summarizeBoard, weekLabel, weekLimits } from "../../domain/week";
import { WeekBoard } from "./week-board";
import { WeekReview } from "./week-review";

export type WeekSearch = { week?: LocalDate; view?: "plan" | "review" };

/**
 * The Week tab, Finisher's home (FIN-042, decision 40): week navigation, the
 * Plan and Review views, and Show done. The week and view live in the URL
 * (A21); the current week has no `week` parameter, so /finisher always opens it.
 */
export function WeekView({ search, onNavigate }: { search: WeekSearch; onNavigate: (next: WeekSearch) => void }) {
  const [showDone, setShowDone] = useState(true); // decision 36: on by default
  const today = zonedNow(browserTimeZone() ?? DEFAULT_TIME_ZONE).date;
  const thisWeek = startOfWeek(today);
  const start = search.week ?? thisWeek;
  const view = search.view ?? "plan";
  const future = start > thisWeek;
  const limits = weekLimits(today);
  const label = weekLabel(start, today);

  function go(week: LocalDate, focusRange = false) {
    onNavigate({ week: week === thisWeek ? undefined : week, view: week > thisWeek ? undefined : search.view });
    if (focusRange) requestAnimationFrame(() => document.getElementById("week-range")?.focus());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-1">
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0"
            disabled={start <= limits.min}
            aria-label={`Previous week, ${formatWeekRange(addDays(start, -7))}`}
            onClick={() => go(addDays(start, -7))}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-0 px-2">
            <h2 id="week-range" tabIndex={-1} className="font-heading text-xl font-medium outline-none sm:text-2xl">
              {formatWeekRange(start)}
            </h2>
            <p className="font-mono text-xs text-muted-foreground">{label ?? `Week of ${formatWeekdayDate(start)}`}</p>
          </div>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0"
            disabled={start >= limits.max}
            aria-label={`Next week, ${formatWeekRange(addDays(start, 7))}`}
            onClick={() => go(addDays(start, 7))}
          >
            <ChevronRightIcon />
          </Button>
          {start !== thisWeek ? (
            <Button variant="ghost" className="ml-1 h-11 px-3 text-accent-foreground" onClick={() => go(thisWeek, true)}>
              This week
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {view === "plan" ? (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox checked={showDone} onCheckedChange={(checked) => setShowDone(checked === true)} />
              Show done
            </label>
          ) : null}
          <div role="group" aria-label="View" className="inline-grid grid-cols-2 gap-1 rounded-xl border bg-card p-1">
            <Button
              variant="ghost"
              aria-pressed={view === "plan"}
              className="h-10 px-4 aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
              onClick={() => onNavigate({ week: search.week, view: undefined })}
            >
              Plan
            </Button>
            <Button
              variant="ghost"
              aria-pressed={view === "review"}
              disabled={future}
              aria-describedby={future ? "week-review-unavailable" : undefined}
              className="h-10 px-4 aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
              onClick={() => onNavigate({ week: search.week, view: "review" })}
            >
              Review
            </Button>
          </div>
        </div>
      </div>
      {future ? (
        <p id="week-review-unavailable" className="-mt-2 text-xs text-muted-foreground sm:text-right">
          You can review a week once it has started.
        </p>
      ) : null}
      {/* The new range is announced when the week changes (FIN-042). */}
      <p role="status" className="sr-only">
        {formatWeekRange(start)}
        {label ? `, ${label.toLowerCase()}` : ""}
      </p>

      <Suspense fallback={<BoardSkeleton />}>
        {view === "review" && !future ? (
          <ReviewPane
            start={search.week}
            onPlanNext={() => onNavigate({ week: addDays(start, 7) === thisWeek ? undefined : addDays(start, 7), view: undefined })}
            onShowPlan={() => onNavigate({ week: search.week, view: undefined })}
          />
        ) : (
          <PlanPane start={search.week} showDone={showDone} />
        )}
      </Suspense>
    </div>
  );
}

function PlanPane({ start, showDone }: { start: LocalDate | undefined; showDone: boolean }) {
  const { data } = useSuspenseQuery(finisherQueries.week(start));
  const weekEnd = addDays(data.weekStart, 6);
  // Every open task due in the week counts as planned, including those shown as carried over.
  const carriedInWeek = (data.carried?.items ?? []).filter((task) => task.dueDate && task.dueDate >= data.weekStart && task.dueDate <= weekEnd);
  const summary = summarizeBoard({
    open: data.days.reduce((sum, day) => sum + day.open.length, 0) + carriedInWeek.length,
    finished: data.days.reduce((sum, day) => sum + day.finished.length, 0),
    sessions: data.days.flatMap((day) => day.sessions),
  });
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[0.8125rem] text-muted-foreground">
        {summary.planned} {summary.planned === 1 ? "task" : "tasks"} planned · {summary.done} done ·{" "}
        {summary.sessionsScheduled ? `Sessions ${summary.sessionsDone} of ${summary.sessionsScheduled} done` : "No sessions scheduled"}
      </p>
      <WeekBoard key={data.weekStart} data={data} showDone={showDone} />
    </div>
  );
}

function ReviewPane({ start, onPlanNext, onShowPlan }: { start: LocalDate | undefined; onPlanNext: () => void; onShowPlan: () => void }) {
  const { data } = useSuspenseQuery(finisherQueries.weekReview(start));
  return <WeekReview data={data} onPlanNext={onPlanNext} onShowPlan={onShowPlan} />;
}

/** Loading state for the board (FIN-042): the summary line and eight columns. */
export function BoardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p className="sr-only" role="status">
        Loading the week…
      </p>
      <Skeleton className="h-4 w-64" />
      <div aria-hidden="true" className="grid gap-2 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-xl border p-2 max-lg:[&:nth-child(n+3)]:hidden">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
