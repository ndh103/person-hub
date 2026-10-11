import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@/components/link";
import { cn } from "@/lib/utils";
import { finisherQueries } from "../../api";
import type { ClosedCounts, ClosedOutcome, ClosedType } from "../../types";
import { ClosedList } from "../closed-list";
import { EmptyState } from "../list-parts";

const TYPES: { value: ClosedType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tasks", label: "Tasks" },
  { value: "projects", label: "Projects" },
];

const OUTCOMES: { value: ClosedOutcome; label: string }[] = [
  { value: "all", label: "Any outcome" },
  { value: "completed", label: "Done or finished" },
  { value: "let_go", label: "Let go" },
];

/** The Closed tab's query string; "all" is the absence of a filter. */
export type ClosedSearch = { type?: Exclude<ClosedType, "all">; outcome?: Exclude<ClosedOutcome, "all"> };

function search(type: ClosedType, outcome: ClosedOutcome): ClosedSearch {
  return { type: type === "all" ? undefined : type, outcome: outcome === "all" ? undefined : outcome };
}

function FilterLinks<T extends string>({
  label,
  options,
  build,
}: {
  label: string;
  options: { value: T; label: string }[];
  build: (value: T) => ClosedSearch;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {options.map((option) => (
          <li key={option.value}>
            <Link
              to="/finisher/closed"
              search={build(option.value)}
              // The current filter is marked aria-current by the link (exact path and query).
              activeOptions={{ exact: true, includeSearch: true }}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                "aria-[current=page]:border-primary aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground",
              )}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Counts for the current filter only; no success percentage (assumption A6). */
function Summary({ counts, type, outcome }: { counts: ClosedCounts; type: ClosedType; outcome: ClosedOutcome }) {
  const parts: string[] = [];
  if (type !== "projects") {
    if (outcome !== "let_go") parts.push(`${counts.tasksDone} tasks done`);
    if (outcome !== "completed") parts.push(`${counts.tasksLetGo} tasks let go`);
  }
  if (type !== "tasks") {
    if (outcome !== "let_go") parts.push(`${counts.projectsFinished} projects finished`);
    if (outcome !== "completed") parts.push(`${counts.projectsLetGo} projects let go`);
  }
  return <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>;
}

/** FIN-032: closed tasks and projects, most recently closed first. */
export function ClosedView({ type, outcome }: ClosedSearch) {
  const { data } = useSuspenseQuery(finisherQueries.closed(type, outcome));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FilterLinks label="Type" options={TYPES} build={(value) => search(value, data.outcome)} />
        <FilterLinks label="Outcome" options={OUTCOMES} build={(value) => search(data.type, value)} />
      </div>
      <Summary counts={data.counts} type={data.type} outcome={data.outcome} />
      {data.page.items.length ? (
        <ClosedList type={data.type} outcome={data.outcome} page={data.page} today={data.now.date} />
      ) : (
        <EmptyState
          title="Your finished work will appear here."
          description="Tasks you complete, projects you finish, and things you decide to let go are kept here."
        />
      )}
    </div>
  );
}
