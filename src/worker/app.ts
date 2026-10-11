import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { FinisherError } from "@/features/finisher/server/errors";
import type { Bindings } from "./env";
import { finisher } from "./finisher";
import { apiError, guardWrites, noStore } from "./http";

/**
 * The JSON API (ADR-0003). wrangler.jsonc routes only /api/* here; every other
 * path is served from the SPA's static assets. No CORS headers are sent: the
 * SPA calls the API on its own origin.
 */
export function createApp() {
  return new Hono<{ Bindings: Bindings }>()
    .basePath("/api")
    .use(noStore)
    .use(secureHeaders({ crossOriginResourcePolicy: "same-origin" }))
    .use(guardWrites)
    .route("/finisher", finisher)
    .notFound((c) => apiError(c, "not_found", 404))
    .onError((error, c) => {
      if (error instanceof FinisherError) return apiError(c, error.code, error.status, error.fields);
      // Log the error type only: messages may echo personal content.
      console.error("api: unexpected error", error instanceof Error ? error.name : "unknown");
      return apiError(c, "unavailable", 503);
    });
}

export type AppType = ReturnType<typeof createApp>;
