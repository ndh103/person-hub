import { Link } from "@/components/link";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/finisher", label: "Today" },
  { to: "/finisher/tasks", label: "Tasks" },
  { to: "/finisher/projects", label: "Projects" },
  { to: "/finisher/closed", label: "Closed" },
] as const;

/**
 * Finisher sections (FIN-001). Each tab is a link with its own URL, styled
 * as a segmented control that fits four tabs at 320px (FIN-018). The current
 * tab gets aria-current="page" from the link (exact path match).
 */
export function FinisherTabs() {
  return (
    <nav aria-label="Finisher sections">
      <ul className="grid grid-cols-4 gap-1 rounded-xl border bg-muted p-1 text-sm font-medium sm:inline-grid">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-lg px-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-4",
                "aria-[current=page]:bg-background aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-sm",
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
