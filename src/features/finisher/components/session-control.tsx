import { CheckCircle2Icon, CircleIcon, SkipForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LocalDate } from "../domain/dates";
import type { SessionState } from "../domain/schedule";
import { useSessionMark } from "./use-session-mark";

const STATE_TEXT: Record<SessionState, string> = { done: "Done", skipped: "Skipped", unmarked: "Not marked" };

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
            className="h-14 w-full flex-col gap-0.5 px-1 text-xs data-[state=done]:border-primary data-[state=done]:bg-primary data-[state=done]:text-primary-foreground data-[state=done]:hover:bg-primary-hover data-[state=done]:hover:text-primary-foreground"
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
