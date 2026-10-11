import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/finisher/components/list-parts";
import { ClosedView } from "@/features/finisher/components/views/closed-view";

export const metadata: Metadata = { title: "Closed · Finisher" };

/** FIN-032: closed tasks and projects (?type=&outcome=). */
export default function FinisherClosedPage({ searchParams }: PageProps<"/finisher/closed">) {
  return (
    <Suspense fallback={<ListSkeleton label="Loading closed items…" />}>
      <ClosedContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ClosedContent({ searchParams }: { searchParams: PageProps<"/finisher/closed">["searchParams"] }) {
  const { type, outcome } = await searchParams;
  return <ClosedView type={type} outcome={outcome} />;
}
