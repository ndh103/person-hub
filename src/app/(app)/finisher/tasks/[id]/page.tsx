import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { TaskView } from "@/features/finisher/components/views/task-view";

// Generic title: task titles are personal and stay out of the document title.
export const metadata: Metadata = { title: "Task · Finisher" };

/** FIN-020: task details. */
export default function FinisherTaskPage({ params }: PageProps<"/finisher/tasks/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton label="Loading task…" rows={1} />}>
      <TaskContent params={params} />
    </Suspense>
  );
}

async function TaskContent({ params }: { params: PageProps<"/finisher/tasks/[id]">["params"] }) {
  const { id } = await params;
  return <TaskView id={id} />;
}
