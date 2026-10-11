import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { TodayView } from "@/features/finisher/components/views/today-view";

export const metadata: Metadata = { title: "Finisher" };

/** FIN-031: Today, the Finisher home. */
export default function FinisherTodayPage() {
  return (
    <Suspense fallback={<ListSkeleton label="Loading today’s plan…" />}>
      <TodayView />
    </Suspense>
  );
}
