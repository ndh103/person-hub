"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MAX_FRAMES = 120;

/**
 * After a client navigation, moves focus to the new page's heading so
 * keyboard and screen-reader users land on the new content (SHELL-003,
 * FIN-001). Initial loads keep the browser's focus. When the heading is
 * unchanged (for example switching Finisher tabs), focus stays where it is.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef<{ pathname: string; heading: Element | null } | null>(null);

  useEffect(() => {
    const before = previous.current;
    // Previously visited routes can stay mounted but hidden, so take the first visible heading.
    const headingNow = () =>
      [...document.querySelectorAll("#main h1")].find((heading) => heading.checkVisibility()) ?? null;
    if (before === null || before.pathname === pathname) {
      previous.current = { pathname, heading: headingNow() };
      return;
    }

    let frame = 0;
    let handle = 0;
    const tryFocus = () => {
      const heading = headingNow();
      if (heading instanceof HTMLElement && heading !== before.heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: false });
        previous.current = { pathname, heading };
        return;
      }
      // The new page may still be streaming; wait a little for its heading.
      if (frame++ < MAX_FRAMES) handle = requestAnimationFrame(tryFocus);
      else previous.current = { pathname, heading: headingNow() };
    };
    handle = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(handle);
  }, [pathname]);

  return null;
}
