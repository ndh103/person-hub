import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionUser } from "@/worker/auth";
import { DEFAULT_TIME_ZONE, isValidTimeZone, zonedNow, type LocalNow } from "../domain/dates";

/** Request header carrying the browser's IANA timezone (assumption A1). */
export const TIME_ZONE_HEADER = "x-time-zone";

export type FinisherContext = {
  user: SessionUser;
  /** Bound to the caller's access token, so RLS and the write functions see the caller's identity. */
  supabase: SupabaseClient;
  timeZone: string;
  now: LocalNow;
};

/**
 * Every Finisher read and write receives one of these. It is built by the
 * Worker's auth middleware only after the access token has been verified
 * (src/worker/auth.ts), so holding a context means the caller is signed in.
 */
export function finisherContext(user: SessionUser, supabase: SupabaseClient, timeZoneHeader: string | undefined): FinisherContext {
  const timeZone = parseTimeZone(timeZoneHeader);
  return { user, supabase, timeZone, now: zonedNow(timeZone) };
}

/** The browser's timezone from the request header, or the default when missing or unknown. */
export function parseTimeZone(value: string | undefined): string {
  return value && value.length <= 64 && isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}
