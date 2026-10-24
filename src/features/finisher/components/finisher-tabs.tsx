import { Link } from "@/components/link";
import { cn } from "@/lib/utils";
import type { FinisherTabCounts } from "../types";

const TABS = [
  { to: "/finisher", label: "Week", count: null, unit: "" },
  { to: "/finisher/tasks", label: "Tasks", count: "tasks", unit: "open" },
  { to: "/finisher/projects", label: "Projects", count: "projects", unit: "active" },
  { to: "/finisher/closed", label: "Closed", count: null, unit: "" },
] as const;

/**
 * Finisher sections (FIN-001): Week (the home, decision 40), Tasks, Projects,
 * Closed. Each tab is a link with its own URL, styled as underline tabs with a
 * muted count pill (foundation 2026-10-13, FIN-035; Week and Closed have no
 * count). The labels and pills fit at 320px (FIN-018); the row scrolls inside
 * itself rather than widening the page if text is enlarged. The list is
 * `relative`, so the screen-reader-only count text stays inside that scroll.
 * The current tab gets aria-current="page" from the link (exact path match)
 * and is marked by weight and an underline, not colour alone. Counts are left
 * out until they have loaded, so a tab never shows a wrong number.
 */
export function FinisherTabs({ counts }: { counts?: FinisherTabCounts }) {
  return (
    <nav aria-label="Finisher sections" className="border-b">
      <ul className="relative -mb-px flex gap-5 overflow-x-auto text-[0.9375rem] sm:gap-8">
        {TABS.map((tab) => {
          const count = tab.count && counts ? counts[tab.count] : null;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={cn(
                  "group inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-standard outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50",
                  "aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground",
                )}
              >
                {tab.label}
                {count !== null ? (
                  <span className="inline-grid min-w-[1.375rem] place-items-center rounded-full bg-muted px-1.5 font-mono text-[0.6875rem] leading-[1.375rem] font-normal text-muted-foreground group-aria-[current=page]:bg-secondary group-aria-[current=page]:text-secondary-foreground">
                    <span className="sr-only">(</span>
                    {count}
                    <span className="sr-only"> {tab.unit})</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
