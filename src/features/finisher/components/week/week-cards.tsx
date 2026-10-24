import { useDraggable } from "@dnd-kit/core";
import { CheckCircle2Icon, CheckIcon, CircleIcon, GripVerticalIcon, MoreHorizontalIcon, Repeat2Icon, SkipForwardIcon } from "lucide-react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDuration, formatWeekdayDate } from "../../domain/dates";
import { isInMarkingWindow, isMissed, type SessionState } from "../../domain/schedule";
import { canSetTime } from "../../domain/week";
import type { SessionItem, TaskItem } from "../../types";
import { useSessionMark } from "../use-session-mark";
import { isPlainClick, useTaskPanel } from "../task-panel-context";
import { TaskActionsMenu, TaskCheck } from "../task-row";
import { useWeekPlan } from "./week-plan-context";

/**
 * Cards on the week board. On phones a card is one row: check-off, title and
 * details, ⋯. In the narrow laptop columns the controls get their own row, so
 * the title can use the full width (design notes, Week planner).
 */
const CARD_GRID =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] [grid-template-areas:'check_title_more'_'check_meta_more'] items-start gap-x-2 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:[grid-template-areas:'handle_check_._more'_'title_title_title_title'_'meta_meta_meta_meta'] lg:gap-x-0.5";

/** An Open, Done or Delegated task on a day, in Unplanned or in Carried over. */
export function PlanTaskCard({ task, carried = false, actions }: { task: TaskItem; carried?: boolean; actions?: React.ReactNode }) {
  const plan = useWeekPlan();
  const panel = useTaskPanel();
  const open = task.status === "open";
  const draggable = open && !carried && plan.dragEnabled;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  });
  const selected = panel?.selectedId === task.id;

  const planItems = open
    ? [
        { label: "Move to day…", onSelect: () => plan.openMoveDialog(task) },
        ...(canSetTime(task, plan.today)
          ? [{ label: "Set time…", caption: task.dueTime ?? "no time", onSelect: () => plan.openSetTime(task) }]
          : []),
        ...(carried && task.dueDate ? [{ label: "Unplan", caption: "remove the day", onSelect: () => void plan.move(task, null, "more") }] : []),
      ]
    : undefined;

  return (
    <article
      ref={setNodeRef}
      data-week-task={task.id}
      className={cn(
        "rounded-lg border bg-card px-1.5 pt-1 pb-1.5 text-card-foreground",
        !open && "bg-transparent",
        isDragging && "opacity-40",
        selected && "bg-accent shadow-[inset_3px_0_0_var(--ring)]",
      )}
    >
      <div className={CARD_GRID}>
        {draggable ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            data-focus="handle"
            {...attributes}
            {...listeners}
            aria-label={`Move “${task.title}” to another day`}
            className="relative hidden h-9 w-7 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none [grid-area:handle] after:absolute after:inset-x-0 after:-inset-y-1 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing lg:grid"
          >
            <GripVerticalIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <div className="flex h-9 items-center [grid-area:check]">
          {task.status === "delegated" ? (
            <span className="grid size-7 place-items-center text-muted-foreground" aria-hidden="true">
              <CheckIcon className="size-3.5" />
            </span>
          ) : (
            <TaskCheck task={task} />
          )}
        </div>
        <Link
          to="/finisher/tasks/$id"
          params={{ id: task.id }}
          data-task-title={task.id}
          data-focus="title"
          aria-current={selected ? "true" : undefined}
          onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
            if (!panel?.enabled || !isPlainClick(event)) return;
            event.preventDefault();
            panel.open(task.id);
          }}
          className={cn(
            "pt-2 text-sm font-medium break-words underline-offset-4 outline-none [grid-area:title] hover:underline focus-visible:underline lg:px-1 lg:pt-1",
            selected && "font-semibold",
            !open && "text-muted-foreground line-through decoration-input",
          )}
        >
          {task.title}
        </Link>
        <TaskMeta task={task} carried={carried} />
        <div className="[grid-area:more] lg:-mr-1">
          <TaskActionsMenu task={task} today={plan.today} projects={plan.projects} planItems={planItems} triggerProps={{ "data-focus": "more" }} />
        </div>
      </div>
      {actions ? <div className="mt-1 flex flex-wrap gap-1 pl-9">{actions}</div> : null}
    </article>
  );
}

function TaskMeta({ task, carried }: { task: TaskItem; carried: boolean }) {
  const parts: React.ReactNode[] = [];
  if (carried && task.dueDate) {
    parts.push(
      <span key="due" className="text-destructive">
        Due <time dateTime={task.dueDate}>{formatWeekdayDate(task.dueDate)}</time>
      </span>,
    );
  }
  if (task.dueTime && task.dueDate) {
    parts.push(
      <time key="time" dateTime={`${task.dueDate}T${task.dueTime}`}>
        {task.dueTime}
      </time>,
    );
  }
  if (task.overdue && !carried) parts.push(<span key="overdue" className="text-destructive">Overdue</span>);
  if (task.status === "done") parts.push(<span key="done">Done</span>);
  if (task.status === "delegated") parts.push(<span key="delegated">Delegated</span>);
  if (task.projectTitle) parts.push(<span key="project" className="break-words">{task.projectTitle}</span>);
  if (!parts.length) return null;
  return (
    <p className="font-mono text-xs text-muted-foreground [grid-area:meta] lg:px-1">
      {parts.map((part, index) => (
        <span key={index}>
          {index ? " · " : ""}
          {part}
        </span>
      ))}
    </p>
  );
}

const STATE_WORD: Record<SessionState | "missed" | "upcoming", string> = {
  done: "Done",
  skipped: "Skipped",
  unmarked: "",
  missed: "Missed",
  upcoming: "Upcoming",
};

/**
 * A project session on its day (FIN-045): told apart from tasks by a dashed
 * leading rule, a repeat icon and "Session" for assistive tech. Markable in
 * the marking window; future ones say Upcoming and older ones are locked.
 */
export function PlanSessionCard({ session }: { session: SessionItem }) {
  const plan = useWeekPlan();
  const { state, mark } = useSessionMark(session.slotId, session.date, session.state);
  const markable = isInMarkingWindow(session.date, plan.today);
  const shown: keyof typeof STATE_WORD = isMissed({ date: session.date, state }, plan.today)
    ? "missed"
    : state === "unmarked" && session.date > plan.today
      ? "upcoming"
      : state;
  const marked = state !== "unmarked";
  const Icon = state === "done" ? CheckCircle2Icon : state === "skipped" ? SkipForwardIcon : CircleIcon;
  const description = `${session.activity}, ${session.projectTitle}, ${formatDuration(session.durationMinutes)}${session.startTime ? ` at ${session.startTime}` : ""}`;

  return (
    <article
      data-week-session={`${session.slotId}|${session.date}`}
      className={cn("rounded-lg border border-l-[3px] border-l-input [border-left-style:dashed] bg-card px-1.5 pt-1 pb-1.5 text-card-foreground", marked && "bg-transparent")}
    >
      <div className={CARD_GRID}>
        <div className="flex h-9 items-center [grid-area:check]">
          {markable ? (
            <Button
              type="button"
              variant="outline"
              aria-pressed={marked}
              aria-label={marked ? `“${session.activity}” is ${STATE_WORD[state].toLowerCase()}. Clear the mark` : `Mark “${session.activity}” done`}
              className="relative size-7 shrink-0 rounded-full after:absolute after:-inset-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary-hover aria-pressed:hover:text-primary-foreground"
              onClick={() => void mark(marked ? "unmarked" : "done", session.activity)}
            >
              <Icon className={cn("size-3.5", !marked && "text-muted-foreground")} />
            </Button>
          ) : (
            <span className="grid size-7 place-items-center text-muted-foreground">
              <Icon aria-hidden="true" className="size-3.5" />
              <span className="sr-only">
                {shown === "upcoming" ? "Upcoming, can’t be marked yet" : `${STATE_WORD[shown] || "Not marked"}, locked`}
              </span>
            </span>
          )}
        </div>
        <p
          className={cn(
            "flex items-start gap-1 pt-2 text-sm font-medium break-words [grid-area:title] lg:px-1 lg:pt-1",
            marked && "text-muted-foreground line-through decoration-input",
          )}
        >
          <Repeat2Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span>
            <span className="sr-only">Session: </span>
            {session.activity}
          </span>
        </p>
        <p className="font-mono text-xs text-muted-foreground [grid-area:meta] lg:px-1">
          {formatDuration(session.durationMinutes)}
          {session.startTime ? ` · ${session.startTime}` : ""}
          {STATE_WORD[shown] ? ` · ${STATE_WORD[shown]}` : ""}
          {" · "}
          <Link to="/finisher/projects/$id" params={{ id: session.projectId }} className="break-words underline-offset-4 hover:underline">
            {session.projectTitle}
          </Link>
        </p>
        {markable ? (
          <div className="[grid-area:more] lg:-mr-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="relative size-9 shrink-0 after:absolute after:-inset-1"
                    aria-label={`More actions for session “${session.activity}”`}
                    title={description}
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem className="min-h-11" disabled={state === "done"} onClick={() => void mark("done", session.activity)}>
                    <CheckCircle2Icon />
                    Mark done
                  </DropdownMenuItem>
                  <DropdownMenuItem className="min-h-11" disabled={state === "skipped"} onClick={() => void mark("skipped", session.activity)}>
                    <SkipForwardIcon />
                    Mark skipped
                  </DropdownMenuItem>
                  <DropdownMenuItem className="min-h-11" disabled={state === "unmarked"} onClick={() => void mark("unmarked", session.activity)}>
                    <CircleIcon />
                    Clear mark
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </article>
  );
}
