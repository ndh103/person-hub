import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Link } from "@/components/link";
import { finisherQueries } from "@/features/finisher/api";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { ProjectForm } from "@/features/finisher/components/project-form";

/** FIN-023: create a project with optional weekly slots. */
export function NewProjectPage() {
  return (
    <section aria-labelledby="new-project-title" className="flex flex-col gap-6">
      <Link
        to="/finisher/projects"
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Projects
      </Link>
      <div className="flex flex-col gap-1">
        <h1 id="new-project-title" tabIndex={-1} className="text-2xl font-bold tracking-tight lg:text-3xl outline-none">
          New project
        </h1>
        <p className="text-sm text-muted-foreground">Something bigger that needs regular time over weeks or months.</p>
      </div>
      <Suspense fallback={<ListSkeleton label="Loading form…" rows={2} />}>
        <NewProjectForm />
      </Suspense>
    </section>
  );
}

function NewProjectForm() {
  const { data } = useSuspenseQuery(finisherQueries.basics());
  const { today } = data;
  return <ProjectForm today={today} />;
}
