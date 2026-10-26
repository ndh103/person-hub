import { useCallback, useState } from "react";

const STORAGE_KEY = "ph-sidebar";

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "collapsed";
  } catch {
    return true;
  }
}

/**
 * Whether the desktop sidebar is expanded or collapsed to its icon rail
 * (SHELL-001). Remembered per browser; it holds no personal data.
 */
export function useSidebarPreference() {
  const [open, setOpenState] = useState(readOpen);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "expanded" : "collapsed");
    } catch {
      // Storage can be unavailable (private mode); the choice still applies to this page.
    }
  }, []);

  return [open, setOpen] as const;
}
