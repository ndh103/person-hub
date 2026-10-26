import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopBar } from "@/components/shell/app-top-bar";
import { RouteFocus } from "@/components/shell/route-focus";
import { useSidebarPreference } from "@/components/shell/sidebar-preference";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PomodoroWatcher } from "@/features/finisher/components/pomodoro";

/**
 * Signed-in shell (SHELL-001/002, AUTH-007). The route's beforeLoad sends
 * signed-out visitors to sign-in first (src/app/router.tsx). That is a
 * convenience only: the API verifies the access token on every read and write.
 */
export function AppLayout({ account }: { account: string | null }) {
  const [sidebarOpen, setSidebarOpen] = useSidebarPreference();
  return (
    <TooltipProvider>
      <Toaster>
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-60"
        >
          Skip to content
        </a>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          className="bg-sidebar text-sidebar-foreground"
          // The collapsed icon rail is wide enough for the 44px avatar and nav targets.
          style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
        >
          <AppSidebar account={account} />
          <SidebarInset
            id="main"
            tabIndex={-1}
            className="min-w-0 bg-sidebar outline-none lg:bg-transparent lg:p-5 lg:pl-0 lg:peer-data-[variant=inset]:m-0 lg:peer-data-[variant=inset]:rounded-none lg:peer-data-[variant=inset]:shadow-none"
          >
            <AppTopBar />
            <div className="flex-1 rounded-t-2xl bg-background text-foreground lg:rounded-2xl lg:shadow-elev-raised lg:ring-1 lg:ring-sidebar-border">
              {/* Wider while the Finisher task side panel is open, so the list keeps its room (FIN-036).
                  A page marked data-wide-page (the Week board) uses the full width with less padding. */}
              <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-12 lg:py-14 lg:not-has-[[data-wide-page]]:has-[[data-task-panel-open]]:max-w-7xl lg:not-has-[[data-wide-page]]:has-[[data-task-panel-open]]:px-8 lg:has-[[data-wide-page]]:max-w-none lg:has-[[data-wide-page]]:px-5 lg:has-[[data-wide-page]]:py-6">
                <Outlet />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <RouteFocus />
        {/* Pomodoro focus and completion popups on every signed-in page (FIN-039). */}
        <PomodoroWatcher />
      </Toaster>
    </TooltipProvider>
  );
}

/** Shown while a page's data loads for the first time. */
export function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading…
      </span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
