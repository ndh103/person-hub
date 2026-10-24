import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { finisherQueries } from "@/features/finisher/api";
import { AddTaskButton } from "@/features/finisher/components/add-task-button";
import { FinisherTabs } from "@/features/finisher/components/finisher-tabs";
import { PomodoroHeader } from "@/features/finisher/components/pomodoro";
import { TaskPanelLayout } from "@/features/finisher/components/task-panel";
import { formatDate } from "@/lib/dates";

/**
 * Finisher header and Week / Tasks / Projects / Closed tabs (FIN-001), as in
 * the app-shell design: the title, a mono "Today · 13 Oct 2026" line, and
 * underline tabs with counts (FIN-035). The header loads on its own, so the
 * tab content never waits for it.
 */
export function FinisherTabsLayout() {
  const { data } = useQuery(finisherQueries.basics());
  return (
    <section aria-labelledby="finisher-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="finisher-title" tabIndex={-1} className="font-heading text-3xl font-medium lg:text-4xl outline-none">
            Finisher
          </h1>
          {data ? (
            <p className="font-mono text-[0.8125rem] text-muted-foreground">
              Today · <time dateTime={data.today}>{formatDate(data.today)}</time>
            </p>
          ) : (
            <Skeleton className="h-4 w-36" />
          )}
          {/* FIN-040: Pomodoros completed today and the running session. */}
          <PomodoroHeader />
        </div>
        {data ? <AddTaskButton today={data.today} projects={data.projects} /> : <Skeleton className="h-11 w-28" />}
      </div>
      <FinisherTabs counts={data?.counts} />
      {/* Task lists in the tabs open tasks in the laptop side panel (FIN-036). */}
      <TaskPanelLayout>
        <Outlet />
      </TaskPanelLayout>
    </section>
  );
}
