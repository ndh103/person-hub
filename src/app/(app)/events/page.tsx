import type { Metadata } from "next";
import { CalendarIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Events" };

/** Events is in the navigation (FIN-001 order) but not specified yet; see the project brief. */
export default function EventsPage() {
  return (
    <section aria-labelledby="events-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 id="events-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          Events
        </h1>
        <p className="text-sm text-muted-foreground">Moments you record in your life.</p>
      </div>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarIcon />
          </EmptyMedia>
          <EmptyTitle>Coming soon</EmptyTitle>
          <EmptyDescription>Events hasn’t been built yet. Its requirements are still being written.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  );
}
