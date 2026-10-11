import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { FormAlert } from "@/features/auth/components/form-alert";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { ProjectForm } from "@/features/finisher/components/project-form";
import { getProject } from "@/features/finisher/server/queries";

export const metadata: Metadata = { title: "Edit project · Finisher" };

/** FIN-024: edit an Active or Parked project's details. Slots are edited on the project page. */
export default function EditProjectPage({ params }: PageProps<"/finisher/projects/[id]/edit">) {
  return (
    <Suspense fallback={<ListSkeleton label="Loading project…" rows={2} />}>
      <EditProject params={params} />
    </Suspense>
  );
}

async function EditProject({ params }: { params: PageProps<"/finisher/projects/[id]/edit">["params"] }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const editable = project.status === "active" || project.status === "parked";
  return (
    <section aria-labelledby="edit-project-title" className="flex flex-col gap-6">
      <Link
        href={`/finisher/projects/${project.id}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Back to project
      </Link>
      <h1 id="edit-project-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
        Edit project
      </h1>
      {editable ? (
        <ProjectForm
          today={project.now.date}
          project={{
            id: project.id,
            title: project.title,
            goal: project.goal,
            doneWhen: project.doneWhen,
            targetDate: project.targetDate,
          }}
        />
      ) : (
        <FormAlert tone="info">Closed projects are read-only. Reopen the project to edit it.</FormAlert>
      )}
    </section>
  );
}
