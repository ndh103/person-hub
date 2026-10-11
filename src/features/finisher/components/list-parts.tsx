import Link from "next/link";
import { FlagIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

/** A titled list of rows on a card. */
export function ListSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={headingId} id={id} className="flex scroll-mt-4 flex-col gap-2">
      <h2 id={headingId} className="text-sm font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function RowList({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y overflow-hidden rounded-xl border bg-card text-card-foreground">
      {children}
    </ul>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Empty className="border border-dashed py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-full bg-accent text-accent-foreground">
          <FlagIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent className="flex-row flex-wrap justify-center">{children}</EmptyContent> : null}
    </Empty>
  );
}

export function NewProjectLink({ variant = "outline" }: { variant?: "default" | "outline" }) {
  return (
    <Button variant={variant} className="h-11 px-4" nativeButton={false} render={<Link href="/finisher/projects/new" />}>
      <PlusIcon data-icon="inline-start" />
      New project
    </Button>
  );
}

/** Loading state for a list view (FIN-001). */
export function ListSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <p className="sr-only" role="status">
        {label}
      </p>
      <Skeleton className="h-4 w-56" />
      <div aria-hidden="true" className="divide-y rounded-xl border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-11 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
