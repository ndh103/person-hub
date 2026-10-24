import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { browserTimeZone } from "../../api";
import { addDays, DEFAULT_TIME_ZONE, formatWeekdayDate, isLocalTime, startOfWeek, zonedNow, type LocalDate, type LocalTime } from "../../domain/dates";
import { formatWeekRange, hourBlock, SET_TIME_HOURS, weekDates, weekLabel } from "../../domain/week";
import type { TaskItem } from "../../types";

/** Dialog on laptop, bottom sheet on phone (design notes, Week planner). */
const SHEET =
  "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md max-lg:top-auto max-lg:bottom-0 max-lg:max-w-full max-lg:translate-y-0 max-lg:rounded-b-none max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]";

const OPTION =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[0.9375rem] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-inherit lg:min-h-10";

function browserNow() {
  return zonedNow(browserTimeZone() ?? DEFAULT_TIME_ZONE);
}

/**
 * FIN-044 Move to day…: the days of a week (past days and the current day
 * disabled, A25), week arrows, and No day (Unplanned). Choosing saves at once.
 * The dialog returns focus to the ⋯ button that opened it.
 */
export function MoveToDayDialog({
  task,
  weekStart,
  onOpenChange,
  onChoose,
}: {
  task: TaskItem | null;
  weekStart: LocalDate;
  onOpenChange: (open: boolean) => void;
  onChoose: (date: LocalDate | null) => void;
}) {
  // "Today" is read when the dialog opens (FIN-034), so a dialog opened after midnight is right.
  const [today] = useState(() => browserNow().date);
  const firstWeek = task?.dueDate && task.dueDate >= today ? startOfWeek(task.dueDate) : weekStart < startOfWeek(today) ? startOfWeek(today) : weekStart;
  const [shown, setShown] = useState(firstWeek);
  const label = weekLabel(shown, today);

  return (
    <Dialog open={task !== null} onOpenChange={onOpenChange}>
      <DialogContent className={SHEET}>
        <DialogHeader>
          <DialogTitle>Move to day</DialogTitle>
          <DialogDescription className="break-words">“{task?.title}”</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11"
            disabled={shown <= startOfWeek(today)}
            aria-label={`Previous week, ${formatWeekRange(addDays(shown, -7))}`}
            onClick={() => setShown(addDays(shown, -7))}
          >
            <ChevronLeftIcon />
          </Button>
          <p id="move-week" className="text-center text-sm font-medium" aria-live="polite">
            {formatWeekRange(shown)}
            {label ? ` · ${label}` : ""}
          </p>
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11"
            aria-label={`Next week, ${formatWeekRange(addDays(shown, 7))}`}
            onClick={() => setShown(addDays(shown, 7))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div role="group" aria-labelledby="move-week" className="flex flex-col gap-0.5">
          {weekDates(shown).map((date) => {
            const current = date === task?.dueDate;
            const past = date < today;
            return (
              <button
                key={date}
                type="button"
                className={OPTION}
                disabled={current || past}
                aria-label={`${formatWeekdayDate(date)}${date === today ? ", today" : ""}${current ? ", current day" : ""}${past ? ", past" : ""}`}
                onClick={() => onChoose(date)}
              >
                <span>{formatWeekdayDate(date)}</span>
                <span className="font-mono text-xs text-muted-foreground">{current ? "current" : past ? "past" : date === today ? "Today" : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t pt-2">
          <button type="button" className={OPTION} disabled={!task?.dueDate} onClick={() => onChoose(null)}>
            <span>No day (Unplanned)</span>
            <span className="font-mono text-xs text-muted-foreground">clears date and time</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * FIN-048 Set time…: hour buttons (A32; past hours on today and the current
 * time disabled), any other time, or No time. Choosing saves at once.
 */
export function SetTimeDialog({
  task,
  onOpenChange,
  onChoose,
}: {
  task: TaskItem | null;
  onOpenChange: (open: boolean) => void;
  onChoose: (time: LocalTime | null) => void;
}) {
  const [now] = useState(browserNow);
  const [other, setOther] = useState(task?.dueTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const day = task?.dueDate ? formatWeekdayDate(task.dueDate) : "";

  function submitOther(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;
    const value = other.slice(0, 5);
    const problem = !isLocalTime(value)
      ? "Enter a time, or choose No time."
      : task.dueDate === now.date && value <= now.time
        ? "That time has already passed today."
        : value === task.dueTime
          ? "That is already the task’s time."
          : null;
    setError(problem);
    if (!problem) onChoose(value);
  }

  return (
    <Dialog open={task !== null} onOpenChange={onOpenChange}>
      <DialogContent className={SHEET}>
        <DialogHeader>
          <DialogTitle>Set time</DialogTitle>
          <DialogDescription className="break-words">
            “{task?.title}” · {day}
          </DialogDescription>
        </DialogHeader>
        <div role="group" aria-label="Hours" className="grid grid-cols-4 gap-2">
          {SET_TIME_HOURS.map((hour) => {
            const blocked = task ? hourBlock(hour, task, now) : null;
            return (
              <button
                key={hour}
                type="button"
                disabled={blocked !== null}
                aria-label={`${hour}, ${day}${blocked === "current" ? ", current time" : blocked === "past" ? ", past" : ""}`}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-lg border border-input bg-card font-mono text-sm leading-tight outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-50 disabled:hover:bg-card disabled:hover:text-inherit",
                )}
                onClick={() => onChoose(hour)}
              >
                <span>{hour}</span>
                {blocked ? <span className="text-[0.625rem] text-muted-foreground">{blocked}</span> : null}
              </button>
            );
          })}
        </div>
        <form className="flex items-end gap-2" onSubmit={submitOther} noValidate>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="set-time-other">Other time</Label>
            <Input
              id="set-time-other"
              type="time"
              step={300}
              className="h-11"
              value={other}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "set-time-error" : undefined}
              onChange={(event) => {
                setOther(event.target.value);
                setError(null);
              }}
            />
          </div>
          <Button type="submit" variant="outline" className="h-11">
            Set
          </Button>
        </form>
        {error ? (
          <p id="set-time-error" role="alert" className="-mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="border-t pt-2">
          <button type="button" className={OPTION} disabled={!task?.dueTime} onClick={() => onChoose(null)}>
            <span>No time</span>
            <span className="font-mono text-xs text-muted-foreground">listed after timed items</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
