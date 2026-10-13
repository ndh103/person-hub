import { Link } from "@/components/link";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/finisher", label: "Today" },
  { to: "/finisher/tasks", label: "Tasks" },
  { to: "/finisher/projects", label: "Projects" },
  { to: "/finisher/closed", label: "Closed" },
] as const;

/**
 * Finisher sections (FIN-001). Each tab is a link with its own URL, styled as
 * underline tabs (foundation 2026-10-13). The four labels fit at 320px
 * (FIN-018); the row scrolls inside itself rather than widening the page if
 * text is enlarged. The current tab gets aria-current="page" from the link
 * (exact path match) and is marked by weight and an underline, not colour alone.
 */
export function FinisherTabs() {
  return (
    <nav aria-label="Finisher sections" className="border-b">
      <ul className="-mb-px flex gap-5 overflow-x-auto text-[0.9375rem] sm:gap-8">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              className={cn(
                "inline-flex min-h-11 items-center border-b-2 border-transparent whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-standard outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50",
                "aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
