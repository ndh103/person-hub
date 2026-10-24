import { CalendarIcon, FlagIcon, HomeIcon, SparklesIcon, type LucideIcon } from "lucide-react";

/** Top-level destinations; the router checks these paths exist. */
type AppPath = "/home" | "/finisher" | "/events" | "/inspiration";

export type HubApp = {
  id: string;
  label: string;
  href: AppPath;
  icon: LucideIcon;
  description: string;
};

/** Home is not an app; it sits above the Apps group. */
export const HOME_LINK: HubApp = {
  id: "home",
  label: "Home",
  href: "/home",
  icon: HomeIcon,
  description: "Overview of your apps.",
};

/**
 * One registry for the sidebar and the Home cards (design note), in
 * navigation order: Finisher first, then Events (FIN-001), then Inspiration (INS-001).
 */
export const HUB_APPS: HubApp[] = [
  {
    id: "finisher",
    label: "Finisher",
    href: "/finisher",
    icon: FlagIcon,
    description: "Finish your tasks and follow through on your projects, week by week.",
  },
  {
    id: "events",
    label: "Events",
    href: "/events",
    icon: CalendarIcon,
    description: "Record moments in your life, like buying a new TV.",
  },
  {
    id: "inspiration",
    label: "Inspiration",
    href: "/inspiration",
    icon: SparklesIcon,
    description: "Keep articles and images that inspired you.",
  },
];

/** The registry entry the pathname belongs to, if any. */
export function activeLink(pathname: string | null): HubApp | null {
  if (!pathname) return null;
  return [HOME_LINK, ...HUB_APPS].find((app) => pathname === app.href || pathname.startsWith(`${app.href}/`)) ?? null;
}
