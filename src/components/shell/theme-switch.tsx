import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

function choose(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies to this page.
  }
}

function useTheme() {
  return useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
}

/** Single icon button for the collapsed sidebar rail: switches to the other theme. */
export function ThemeToggleButton() {
  const theme = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={label}
            onClick={() => choose(theme === "dark" ? "light" : "dark")}
          />
        }
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Light/Dark segmented switch in the sidebar footer (SHELL-001). */
export function ThemeSwitch() {
  const theme = useTheme();

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
      <ToggleGroupItem value="light" className="min-h-11 w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-pressed:bg-sidebar-accent data-pressed:font-semibold data-pressed:text-sidebar-accent-foreground">
        <SunIcon data-icon="inline-start" />
        Light
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className="min-h-11 w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-pressed:bg-sidebar-accent data-pressed:font-semibold data-pressed:text-sidebar-accent-foreground">
        <MoonIcon data-icon="inline-start" />
        Dark
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
