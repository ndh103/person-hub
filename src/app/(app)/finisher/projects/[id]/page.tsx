import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { ProjectView } from "@/features/finisher/components/views/project-view";

// Generic title: project titles are personal and stay out of the document title.
export const metadata: Metadata = { title: "Project · Finisher" };

/** FIN-024: project details. */
export default function FinisherProjectPage({ params }: PageProps<"/finisher/projects/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton label="Loading project…" />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/finisher/projects/[id]">["params"] }) {
  const { id } = await params;
  return <ProjectView id={id} />;
}
