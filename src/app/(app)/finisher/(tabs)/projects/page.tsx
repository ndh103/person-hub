import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { ProjectsView } from "@/features/finisher/components/views/projects-view";

export const metadata: Metadata = { title: "Projects · Finisher" };

/** FIN-033: active and parked projects. */
export default function FinisherProjectsPage() {
  return (
    <Suspense fallback={<ListSkeleton label="Loading projects…" />}>
      <ProjectsView />
    </Suspense>
  );
}
