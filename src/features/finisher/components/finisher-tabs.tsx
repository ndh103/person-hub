"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/finisher", label: "Today" },
  { href: "/finisher/tasks", label: "Tasks" },
  { href: "/finisher/projects", label: "Projects" },
  { href: "/finisher/closed", label: "Closed" },
] as const;

/**
 * Finisher sections (FIN-001). Each tab is a link with its own URL, styled
 * as a segmented control that fits four tabs at 320px (FIN-018).
 */
export function FinisherTabs() {
  return (
    <nav aria-label="Finisher sections">
      <Suspense fallback={<TabList current={null} />}>
        <ActiveTabList />
      </Suspense>
    </nav>
  );
}

function ActiveTabList() {
  const pathname = usePathname();
  const current = TABS.find((tab) => tab.href === pathname)?.href ?? null;
  return <TabList current={current} />;
}

function TabList({ current }: { current: string | null }) {
  return (
    <ul className="grid grid-cols-4 gap-1 rounded-xl border bg-muted p-1 text-sm font-medium sm:inline-grid">
      {TABS.map((tab) => (
        <li key={tab.href}>
          <Link
            href={tab.href}
            aria-current={current === tab.href ? "page" : undefined}
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
  );
}
