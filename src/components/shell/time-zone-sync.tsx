"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/features/finisher/time-zone";

/**
 * Keeps the `ph-tz` cookie equal to the browser's IANA timezone, so the server
 * computes "today" in the user's zone (Finisher assumption A1). When it
 * changes (first visit, travel), the page is refreshed with the new zone.
 */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    let zone: string;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone) return;
    const current = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.slice(TIME_ZONE_COOKIE.length + 1);
    if (current && decodeURIComponent(current) === zone) return;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax${secure}`;
    router.refresh();
  }, [router]);

  return null;
}
