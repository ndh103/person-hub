import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { finisherQueries } from "@/features/finisher/api";
import { AddTaskButton } from "@/features/finisher/components/add-task-button";
import { FinisherTabs } from "@/features/finisher/components/finisher-tabs";

/** Finisher header and Today / Tasks / Projects / Closed tabs (FIN-001). */
export function FinisherTabsLayout() {
  return (
    <section aria-labelledby="finisher-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="finisher-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            Finisher
          </h1>
          <p className="text-sm text-muted-foreground">Follow through on your tasks and projects.</p>
        </div>
        <HeaderActions />
      </div>
      <FinisherTabs />
      <div>
        <Outlet />
      </div>
    </section>
  );
}

/** Loads on its own, so the tab content never waits for the header. */
function HeaderActions() {
  const { data } = useQuery(finisherQueries.basics());
  if (!data) return <Skeleton className="h-11 w-28" />;
  return <AddTaskButton today={data.today} projects={data.projects} />;
}
