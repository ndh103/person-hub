import Link from "next/link";
import { cn } from "@/lib/utils";
import { getClosed } from "../../server/queries";
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

function href(type: ClosedType, outcome: ClosedOutcome) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (outcome !== "all") params.set("outcome", outcome);
  const query = params.toString();
  return query ? `/finisher/closed?${query}` : "/finisher/closed";
}

function FilterLinks<T extends string>({
  label,
  options,
  current,
  build,
}: {
  label: string;
  options: { value: T; label: string }[];
  current: T;
  build: (value: T) => string;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {options.map((option) => (
          <li key={option.value}>
            <Link
              href={build(option.value)}
              aria-current={option.value === current ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                "aria-[current=true]:border-primary aria-[current=true]:bg-accent aria-[current=true]:font-semibold aria-[current=true]:text-accent-foreground",
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
export async function ClosedView({ type, outcome }: { type: unknown; outcome: unknown }) {
  const data = await getClosed(type, outcome, null);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FilterLinks label="Type" options={TYPES} current={data.type} build={(value) => href(value, data.outcome)} />
        <FilterLinks label="Outcome" options={OUTCOMES} current={data.outcome} build={(value) => href(data.type, value)} />
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
