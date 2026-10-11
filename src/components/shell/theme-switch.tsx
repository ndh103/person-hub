"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Same key as the pre-paint script in the root layout. */
const STORAGE_KEY = "ph-theme";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Light/Dark segmented switch in the sidebar footer (SHELL-001). */
export function ThemeSwitch() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);

  function choose(next: Theme) {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies to this page.
    }
  }

  return (
    <ToggleGroup
      aria-label="Theme"
      value={theme ? [theme] : []}
      onValueChange={(value) => {
        const next = value[0];
        if (next === "light" || next === "dark") choose(next);
      }}
      spacing={1}
      className="grid w-full grid-cols-2 rounded-xl border border-sidebar-border p-1"
    >
      <ToggleGroupItem value="light" className="min-h-11 w-full data-pressed:bg-sidebar-accent data-pressed:font-semibold">
        <SunIcon data-icon="inline-start" />
        Light
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className="min-h-11 w-full data-pressed:bg-sidebar-accent data-pressed:font-semibold">
        <MoonIcon data-icon="inline-start" />
        Dark
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
