import { useState } from "react";
import { CheckCircle2Icon, CircleIcon, MoreHorizontalIcon, SkipForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { finisherApi } from "../api";
import type { LocalDate } from "../domain/dates";
import type { SessionState } from "../domain/schedule";
import { generalErrorMessage } from "../messages";
import { useFinisherRefresh } from "./use-refresh";

/** Saves a session mark optimistically and reverts with a message on failure (FIN-031). */
function useSessionMark(slotId: string, date: LocalDate, saved: SessionState) {
  const refresh = useFinisherRefresh();
  const [optimistic, setOptimistic] = useState<SessionState | null>(null);
  const state = optimistic ?? saved;

  async function mark(next: SessionState, label: string) {
    setOptimistic(next);
    const result = await finisherApi("PUT", "/api/finisher/sessions", { slotId, date, state: next });
    if (!result.ok) {
      setOptimistic(null);
      toast.add({ title: `Couldn’t update “${label}”`, description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    // Keep the optimistic state until the refreshed views have the saved mark.
    void refresh().finally(() => setOptimistic(null));
  }

  return { state, mark };
}

const STATE_TEXT: Record<SessionState, string> = { done: "Done", skipped: "Skipped", unmarked: "Not marked" };

/**
 * Today's check-off (FIN-031): tapping marks Done; tapping a Done or Skipped
 * session returns it to Unmarked. Skip sits in the item menu.
 */
export function SessionCheck({ slotId, date, state: saved, activity }: { slotId: string; date: LocalDate; state: SessionState; activity: string }) {
  const { state, mark } = useSessionMark(slotId, date, saved);
  const marked = state !== "unmarked";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="outline"
        aria-pressed={state === "done"}
        aria-label={state === "skipped" ? `Undo skip for “${activity}”` : `Mark “${activity}” done`}
        className="h-11 gap-2 px-3 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        onClick={() => void mark(marked ? "unmarked" : "done", activity)}
      >
        {state === "done" ? (
          <CheckCircle2Icon data-icon="inline-start" />
        ) : state === "skipped" ? (
          <SkipForwardIcon data-icon="inline-start" />
        ) : (
          <CircleIcon data-icon="inline-start" />
        )}
        <span aria-hidden="true">{state === "skipped" ? "Skipped" : "Done"}</span>
      </Button>
      {state === "unmarked" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-lg" className="size-11" aria-label={`More actions for “${activity}”`} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem className="min-h-11" onClick={() => void mark("skipped", activity)}>
                <SkipForwardIcon />
                Skip today
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/**
 * A cell of the project's 7-day strip (FIN-027): opens a menu to set Done,
 * Skipped or Unmarked for any date in the marking window.
 */
export function StripCell({
  slotId,
  date,
  state: saved,
  activity,
  dayLabel,
  fullDate,
  disabled,
}: {
  slotId: string;
  date: LocalDate;
  state: SessionState;
  activity: string;
  dayLabel: string;
  fullDate: string;
  disabled?: boolean;
}) {
  const { state, mark } = useSessionMark(slotId, date, saved);
  const Icon = state === "done" ? CheckCircle2Icon : state === "skipped" ? SkipForwardIcon : CircleIcon;
  const options: { value: SessionState; label: string }[] = [
    { value: "done", label: "Done" },
    { value: "skipped", label: "Skipped" },
    { value: "unmarked", label: "Not marked" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            className="h-14 w-full flex-col gap-0.5 px-1 text-xs data-[state=done]:border-primary data-[state=done]:bg-primary data-[state=done]:text-primary-foreground"
            data-state={state}
            aria-label={`${activity}, ${fullDate}: ${STATE_TEXT[state]}. Change`}
          />
        }
      >
        <span aria-hidden="true">{dayLabel}</span>
        <Icon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className="min-h-11"
              disabled={option.value === state}
              onClick={() => void mark(option.value, activity)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
