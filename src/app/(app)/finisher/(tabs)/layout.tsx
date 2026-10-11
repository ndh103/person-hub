import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddTaskButton } from "@/features/finisher/components/add-task-button";
import { FinisherTabs } from "@/features/finisher/components/finisher-tabs";
import { getFinisherBasics } from "@/features/finisher/server/queries";

/** Finisher header and Today / Tasks / Projects / Closed tabs (FIN-001). */
export default function FinisherTabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="finisher-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="finisher-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            Finisher
          </h1>
          <p className="text-sm text-muted-foreground">Follow through on your tasks and projects.</p>
        </div>
        <Suspense fallback={<Skeleton className="h-11 w-28" />}>
          <HeaderActions />
        </Suspense>
      </div>
      <FinisherTabs />
      <div>{children}</div>
    </section>
  );
}

async function HeaderActions() {
  const { today, projects } = await getFinisherBasics();
  return <AddTaskButton today={today} projects={projects} />;
}
