import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { TasksView } from "@/features/finisher/components/views/tasks-view";

export const metadata: Metadata = { title: "Tasks · Finisher" };

/** FIN-022: open tasks by group, filterable by project (?project=). */
export default function FinisherTasksPage({ searchParams }: PageProps<"/finisher/tasks">) {
  return (
    <Suspense fallback={<ListSkeleton label="Loading tasks…" />}>
      <TasksContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TasksContent({ searchParams }: { searchParams: PageProps<"/finisher/tasks">["searchParams"] }) {
  const { project } = await searchParams;
  return <TasksView project={project} />;
}
