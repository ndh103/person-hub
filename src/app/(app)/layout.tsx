import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getSessionUser } from "@/lib/server/auth";

/**
 * Signed-in area (AUTH-007). proxy.ts redirects signed-out visitors first; this
 * layout checks the verified session again before rendering any page.
 *
 * Minimal frame only: the full sidebar shell from
 * output/designs/app-shell/ is a separate implementation task.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppFrameSkeleton />}>
      <SignedInFrame>{children}</SignedInFrame>
    </Suspense>
  );
}

async function SignedInFrame({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
            aria-hidden="true"
          >
            PH
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-semibold">Personal Hub</p>
            {user.email ? <p className="truncate text-sm">{user.email}</p> : null}
          </div>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 rounded-t-2xl bg-background text-foreground lg:mx-5 lg:mb-5 lg:rounded-2xl">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-12 lg:py-14">{children}</div>
      </main>
    </div>
  );
}

function AppFrameSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col gap-4 p-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading…
      </span>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
