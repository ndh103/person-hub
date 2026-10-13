import "@fontsource-variable/inter";
// Optical-size axis (plus weight), so large headings use the display cut.
import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource-variable/jetbrains-mono";
import "./app/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createAppRouter } from "@/app/router";
import { navigateTo, signOut } from "@/features/auth/api";
import { FinisherLoadError } from "@/features/finisher/api";
import { setUnauthenticatedHandler } from "@/lib/api";
import { currentSession, supabase } from "@/lib/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only failures that may pass on their own; never 401/404/validation.
      retry: (failures, error) =>
        failures < 2 && error instanceof FinisherLoadError && (error.code === "network" || error.code === "unavailable"),
    },
  },
});

const router = createAppRouter(queryClient);

// The API refused the session (expired or revoked elsewhere): drop it here
// too and ask the user to sign in again, then return to the same page.
let endingSession = false;
setUnauthenticatedHandler(() => {
  if (endingSession) return;
  endingSession = true;
  const next = router.state.location.href;
  void signOut().finally(() => navigateTo(`/sign-in?reason=expired&next=${encodeURIComponent(next)}`));
});

// Signed out (here or in another tab): forget every cached response and let
// the route guards send the user to sign-in. Deferred, because Supabase must
// not be called from inside its own auth callback.
supabase().auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_OUT") return;
  setTimeout(() => {
    queryClient.clear();
    void router.invalidate();
  }, 0);
});

// A page restored from the back/forward cache after signing out would still
// show its old content: reload it, and the route guards take over.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  void currentSession().then((session) => {
    if (!session) window.location.reload();
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
