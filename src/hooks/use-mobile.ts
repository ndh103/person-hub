import * as React from "react"

// Matches the shell design: below 1024px (lg) the sidebar is a drawer (SHELL-002).
const MOBILE_BREAKPOINT = 1024
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // Server render: assume desktop; the desktop sidebar is hidden below lg by CSS.
    () => false
  )
}
