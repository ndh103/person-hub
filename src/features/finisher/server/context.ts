import "server-only";
import { cookies } from "next/headers";
import { requireUser, type SessionUser } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, isValidTimeZone, zonedNow, type LocalNow } from "../domain/dates";
import { TIME_ZONE_COOKIE } from "../time-zone";

export type FinisherContext = {
  user: SessionUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
  timeZone: string;
  now: LocalNow;
};

/**
 * Entry point for every Finisher read and write. Verifies the session
 * (throws UnauthenticatedError) and returns a Supabase client bound to the
 * caller's session, so RLS and the write functions see the caller's identity.
 */
export async function finisherContext(): Promise<FinisherContext> {
  const user = await requireUser();
  const supabase = await createClient();
  const timeZone = await readTimeZone();
  return { user, supabase, timeZone, now: zonedNow(timeZone) };
}

/** The browser's IANA timezone (assumption A1), from a cookie the shell keeps current. */
export async function readTimeZone(): Promise<string> {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  const decoded = value ? safeDecode(value) : null;
  return decoded && isValidTimeZone(decoded) ? decoded : DEFAULT_TIME_ZONE;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
