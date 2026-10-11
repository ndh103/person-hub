import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopBar } from "@/components/shell/app-top-bar";
import { RouteFocus } from "@/components/shell/route-focus";
import { TimeZoneSync } from "@/components/shell/time-zone-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionUser } from "@/lib/server/auth";

/**
 * Signed-in shell (SHELL-001/002, AUTH-007). The navigation chrome is static;
 * everything personal streams in behind Suspense. proxy.ts redirects
 * signed-out visitors first, and SignedIn checks the verified session again
 * before any page renders. Data access re-checks it on every read and write.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
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
          className="bg-sidebar text-sidebar-foreground"
          style={{ "--sidebar-width": "17rem" } as React.CSSProperties}
        >
          <AppSidebar
            account={
              <Suspense fallback={<span className="sr-only">Loading account</span>}>
                <AccountEmail />
              </Suspense>
            }
          />
          <SidebarInset
            id="main"
            tabIndex={-1}
            className="min-w-0 bg-sidebar outline-none lg:bg-transparent lg:p-5 lg:pl-0 lg:peer-data-[variant=inset]:m-0 lg:peer-data-[variant=inset]:rounded-none lg:peer-data-[variant=inset]:shadow-none"
          >
            <AppTopBar />
            <div className="flex-1 rounded-t-2xl bg-background text-foreground lg:rounded-2xl lg:shadow-lg lg:ring-1 lg:ring-sidebar-border">
              <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-12 lg:py-14">
                <Suspense fallback={<ContentSkeleton />}>
                  <SignedIn>{children}</SignedIn>
                </Suspense>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Suspense fallback={null}>
          <RouteFocus />
        </Suspense>
        <TimeZoneSync />
      </Toaster>
    </TooltipProvider>
  );
}

async function SignedIn({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return children;
}

async function AccountEmail() {
  const user = await getSessionUser();
  return user?.email ?? null;
}

function ContentSkeleton() {
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
