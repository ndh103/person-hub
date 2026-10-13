import { MenuIcon } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { activeLink } from "./apps";

/** Phone and tablet top bar on the frame colour (SHELL-002): menu button and current app name. */
export function AppTopBar() {
  const { openMobile, toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-sidebar px-2 text-sidebar-foreground lg:hidden">
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-11 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring"
        aria-label="Open navigation"
        aria-expanded={openMobile}
        onClick={toggleSidebar}
      >
        <MenuIcon />
      </Button>
      <p className="truncate font-heading text-lg font-medium">
        <CurrentAppName />
      </p>
    </header>
  );
}

function CurrentAppName() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return activeLink(pathname)?.label ?? "Personal Hub";
}
