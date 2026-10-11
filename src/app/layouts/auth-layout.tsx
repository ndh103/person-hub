import { Outlet } from "@tanstack/react-router";

/** Sign-in pages sit outside the app shell and show only the hub name (AUTH-010). */
export function AuthLayout() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-sidebar px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-center gap-3 text-sidebar-foreground">
          <span
            className="grid size-11 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
            aria-hidden="true"
          >
            PH
          </span>
          <span className="text-lg font-semibold">Personal Hub</span>
        </div>
        <Outlet />
      </div>
    </main>
  );
}
