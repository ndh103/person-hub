"use client";

import { ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** A collapsed-by-default group such as "Done today" or "Parked" (FIN-031, FIN-022). */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  id,
  children,
}: {
  title: string;
  count: number | string;
  defaultOpen?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} id={id} className="flex flex-col gap-2 scroll-mt-4">
      <h2 className="text-sm font-semibold">
        <CollapsibleTrigger className="group/trigger -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
          <ChevronRightIcon aria-hidden="true" className="size-4 transition-transform group-data-[panel-open]/trigger:rotate-90" />
          {title}
          <span className="font-normal text-muted-foreground">({count})</span>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
