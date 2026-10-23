import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@/components/link";
import { CheckIcon, CircleIcon, MoreHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { browserTimeZone, finisherApi } from "../api";
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatRelativeDate,
  formatWeekdayDate,
  zonedNow,
  type LocalDate,
  type LocalTime,
} from "../domain/dates";
import { QUICK_DUE_KINDS, QUICK_DUE_LABELS, quickDueChoice, type QuickDueChoice } from "../domain/quick-due";
import type { MoveTarget } from "../domain/task-order";
import { generalErrorMessage } from "../messages";
import type { ProjectOption, TaskDetail, TaskItem } from "../types";
import { DelegateDialog, DeleteDialog, LetGoDialog, ParkDialog } from "./lifecycle-dialogs";
import { isPlainClick, useTaskPanel } from "./task-panel-context";
import { TaskFormDialog } from "./task-form-dialog";
import { useFinisherRefresh } from "./use-refresh";

/** Due wording, e.g. "Overdue · due 7 Oct 2026" or "Due today · 17:00"; full date for assistive tech. */
export function TaskDue({ task, today }: { task: TaskItem; today: LocalDate }) {
  if (task.status === "parked" && task.revisitDate) {
    const due = task.revisitDate <= today;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2">
        {due ? <Badge variant="secondary">Due for revisit</Badge> : null}
        <span>
          Revisit <time dateTime={task.revisitDate}>{formatRelativeDate(task.revisitDate, today)}</time>
          {formatRelativeDate(task.revisitDate, today) !== formatDate(task.revisitDate) ? <span className="sr-only"> ({formatDate(task.revisitDate)})</span> : null}
        </span>
      </span>
    );
  }
  if (!task.dueDate) return null;
  const label = formatRelativeDate(task.dueDate, today);
  return (
    <span className={cn(task.overdue && "text-destructive")}>
      {task.overdue ? "Overdue · due " : "Due "}
      <time dateTime={task.dueTime ? `${task.dueDate}T${task.dueTime}` : task.dueDate}>
        {label === "Today" || label === "Tomorrow" || label === "Yesterday" ? label.toLowerCase() : label}
        {task.dueTime ? ` ${task.dueTime}` : ""}
      </time>
      {formatRelativeDate(task.dueDate, today) !== formatDate(task.dueDate) ? <span className="sr-only"> ({formatDate(task.dueDate)})</span> : null}
    </span>
  );
}

/** After a refresh moved a task to another section, its menu trigger is gone: put focus on its title. */
function focusTaskIfLost(id: string) {
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) return;
  document.querySelector<HTMLElement>(`[data-task-title="${id}"]`)?.focus();
}

/**
 * Check-off control (FIN-021): a real button that announces its pressed
 * state. Completing is optimistic; failure reverts it with a message, and
 * success offers Undo, which reopens the task in its old place (FIN-038).
 * `labelled` is the side panel's "Mark done" button (FIN-036).
 */
export function TaskCheck({ task, variant = "icon" }: { task: TaskItem; variant?: "icon" | "labelled" }) {
  const refresh = useFinisherRefresh();
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const done = optimisticDone ?? task.status === "done";

  async function setDone(next: boolean, keepPosition = false) {
    setBusy(true);
    setOptimisticDone(next);
    const result = await finisherApi("POST", `/api/finisher/tasks/${task.id}/actions`, next ? { action: "done" } : { action: "reopen", keepPosition });
    setBusy(false);
    if (!result.ok) {
      setOptimisticDone(null);
      toast.add({ title: "Couldn’t update the task", description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    if (next) {
      toast.add({
        title: `Done: “${task.title}”`,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void setDone(false, true) },
      });
    }
    void refresh().finally(() => setOptimisticDone(null));
  }

  if (variant === "labelled") {
    return (
      <Button
        type="button"
        variant="outline"
        aria-pressed={done}
        disabled={busy}
        className="h-11 aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
        onClick={() => void setDone(!done)}
      >
        {done ? <CheckIcon data-icon="inline-start" /> : <CircleIcon data-icon="inline-start" />}
        {done ? "Done" : "Mark done"}
        <span className="sr-only"> — {task.title}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={done}
      aria-label={`Mark “${task.title}” done`}
      disabled={busy}
      // 28px circle; the ::after keeps a 44px touch target.
      className="relative size-7 shrink-0 rounded-full after:absolute after:-inset-2 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary-hover aria-pressed:hover:text-primary-foreground"
      onClick={() => void setDone(!done)}
    >
      {done ? <CheckIcon className="size-3.5" /> : <CircleIcon className="size-3.5 text-muted-foreground" />}
    </Button>
  );
}

const QUICK_DUE_WORDS = { today: "today", tomorrow: "tomorrow", nextWeek: "next week" } as const;

const MOVE_LABELS: Record<MoveTarget, string> = {
  top: "Move to top",
  up: "Move up",
  down: "Move down",
  bottom: "Move to bottom",
};

/** Reorder controls a sortable section passes to its rows (FIN-038). */
export type RowReorder = { moves: MoveTarget[]; onMove: (target: MoveTarget) => void };

/**
 * FIN-037: Today / Tomorrow / Next week for an Open task. Rendered only while
 * the menu is open, so "now" is read when the menu opens.
 */
function QuickDueItems({ task, onChoose }: { task: TaskItem; onChoose: (choice: QuickDueChoice) => void }) {
  const now = zonedNow(browserTimeZone() ?? DEFAULT_TIME_ZONE);
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="font-mono text-[0.6875rem] tracking-[0.12em] uppercase">Due</DropdownMenuLabel>
      {QUICK_DUE_KINDS.map((kind) => {
        const choice = quickDueChoice(kind, task, now);
        const caption = formatWeekdayDate(choice.date);
        return (
          <DropdownMenuItem
            key={kind}
            className="min-h-11 justify-between gap-3"
            disabled={choice.current}
            aria-label={`Set due date to ${QUICK_DUE_WORDS[kind]}, ${caption}${choice.current ? " (current due date)" : ""}`}
            onClick={() => onChoose(choice)}
          >
            <span>{QUICK_DUE_LABELS[kind]}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {caption}
              {choice.current ? " · current" : ""}
            </span>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
  );
}

type OpenDialog = "edit" | "park" | "delegate" | "letgo" | "delete" | null;

/** Per-item menu with secondary actions (FIN-018), quick due dates (FIN-037) and Move items (FIN-038). */
export function TaskActionsMenu({
  task,
  today,
  projects,
  editTask,
  deleteRedirect,
  onDeleted,
  reorder,
}: {
  task: TaskItem;
  today: LocalDate;
  projects: ProjectOption[];
  /** Detail data for Edit; when absent, Edit links to the task page. */
  editTask?: TaskDetail;
  /** Where to go after deleting (the task page itself would no longer exist). */
  deleteRedirect?: "/finisher/tasks";
  /** Called after a successful delete (the side panel closes itself). */
  onDeleted?: () => void;
  reorder?: RowReorder;
}) {
  const navigate = useNavigate();
  const refresh = useFinisherRefresh();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const open = task.status === "open" || task.status === "parked";

  async function simple(action: "unpark" | "reopen") {
    const result = await finisherApi("POST", `/api/finisher/tasks/${task.id}/actions`, { action });
    if (!result.ok) {
      toast.add({ title: "Couldn’t update the task", description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    toast.add({ title: action === "unpark" ? `Unparked “${task.title}”` : `Reopened “${task.title}”`, type: "success" });
    void refresh();
  }

  async function setDue(dueDate: LocalDate | null, dueTime: LocalTime | null) {
    return finisherApi("PUT", `/api/finisher/tasks/${task.id}/due`, { dueDate, dueTime });
  }

  // FIN-037: saved at once, then Undo restores the previous date and time (not the place, A15).
  async function reschedule(choice: QuickDueChoice) {
    const previous = { dueDate: task.dueDate, dueTime: task.dueTime };
    const result = await setDue(choice.date, choice.time);
    if (!result.ok) {
      toast.add({ title: "Couldn’t change the due date", description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    toast.add({
      title: `Due ${QUICK_DUE_WORDS[choice.kind]}, ${formatDate(choice.date)}`,
      type: "success",
      actionProps: {
        children: "Undo",
        onClick: () =>
          void setDue(previous.dueDate, previous.dueTime).then((undo) => {
            if (!undo.ok) {
              toast.add({ title: "Couldn’t undo the change", description: generalErrorMessage(undo.error), type: "error" });
            }
            return refresh().then(() => focusTaskIfLost(task.id));
          }),
      },
    });
    await refresh();
    focusTaskIfLost(task.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-lg" className="relative size-9 shrink-0 after:absolute after:-inset-1" aria-label={`More actions for “${task.title}”`} />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {task.status === "open" ? (
            <>
              <QuickDueItems task={task} onChoose={(choice) => void reschedule(choice)} />
              <DropdownMenuSeparator />
            </>
          ) : null}
          {open ? (
            <DropdownMenuGroup>
              {editTask ? (
                <DropdownMenuItem className="min-h-11" onClick={() => setDialog("edit")}>
                  Edit
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="min-h-11" render={<Link to="/finisher/tasks/$id" params={{ id: task.id }} />}>
                  Open and edit
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          ) : null}
          {reorder && reorder.moves.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-mono text-[0.6875rem] tracking-[0.12em] uppercase">Order</DropdownMenuLabel>
                {reorder.moves.map((target) => (
                  <DropdownMenuItem key={target} className="min-h-11" onClick={() => reorder.onMove(target)}>
                    {MOVE_LABELS[target]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuGroup>
            {open ? (
              <DropdownMenuItem className="min-h-11" onClick={() => setDialog("park")}>
                {task.status === "parked" ? "Change revisit date" : "Park"}
              </DropdownMenuItem>
            ) : null}
            {task.status === "parked" ? (
              <DropdownMenuItem className="min-h-11" onClick={() => void simple("unpark")}>
                Unpark
              </DropdownMenuItem>
            ) : null}
            {open ? (
              <DropdownMenuItem className="min-h-11" onClick={() => setDialog("delegate")}>
                Delegate…
              </DropdownMenuItem>
            ) : null}
            {open ? (
              <DropdownMenuItem className="min-h-11" onClick={() => setDialog("letgo")}>
                Let go
              </DropdownMenuItem>
            ) : null}
            {!open ? (
              <DropdownMenuItem className="min-h-11" onClick={() => void simple("reopen")}>
                Reopen
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" className="min-h-11" onClick={() => setDialog("delete")}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {editTask ? (
        <TaskFormDialog
          open={dialog === "edit"}
          onOpenChange={(next) => setDialog(next ? "edit" : null)}
          today={today}
          projects={projects}
          task={editTask}
        />
      ) : null}
      <ParkDialog
        open={dialog === "park"}
        onOpenChange={(next) => setDialog(next ? "park" : null)}
        kind="task"
        id={task.id}
        title={task.title}
        today={today}
        current={task.status === "parked" ? task.revisitDate : null}
      />
      <DelegateDialog open={dialog === "delegate"} onOpenChange={(next) => setDialog(next ? "delegate" : null)} id={task.id} title={task.title} />
      <LetGoDialog open={dialog === "letgo"} onOpenChange={(next) => setDialog(next ? "letgo" : null)} kind="task" id={task.id} title={task.title} />
      <DeleteDialog
        open={dialog === "delete"}
        onOpenChange={(next) => setDialog(next ? "delete" : null)}
        kind="task"
        id={task.id}
        title={task.title}
        onDeleted={
          deleteRedirect
            ? () => {
                void navigate({ to: deleteRedirect, replace: true }).then(() => refresh());
              }
            : onDeleted
              ? () => {
                  onDeleted();
                  void refresh();
                }
              : undefined
        }
      />
    </>
  );
}

/**
 * One task in a list: optional drag handle (FIN-038), check-off, title, due
 * and project, actions. On laptop a plain click on the title opens the side
 * panel (FIN-036); the title stays a real link to the task page, so phones and
 * modifier clicks (a new tab) still open the full page.
 */
export function TaskRow({
  task,
  today,
  projects,
  showProject = true,
  handle,
  reorder,
  rowRef,
  style,
  className,
}: {
  task: TaskItem;
  today: LocalDate;
  projects: ProjectOption[];
  showProject?: boolean;
  handle?: React.ReactNode;
  reorder?: RowReorder;
  rowRef?: (element: HTMLLIElement | null) => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const panel = useTaskPanel();
  const selected = panel?.selectedId === task.id;
  const closable = task.status === "open" || task.status === "parked" || task.status === "done";
  return (
    <li
      ref={rowRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4",
        handle !== undefined && "gap-2 pl-1 sm:gap-3 sm:pl-2",
        // Selected in the panel: tint plus a leading bar, not colour alone (FIN-036).
        selected && "bg-accent shadow-[inset_3px_0_0_var(--ring)]",
        className,
      )}
    >
      {handle}
      {closable ? <TaskCheck task={task} /> : null}
      <div className="min-w-0 flex-1">
        <Link
          to="/finisher/tasks/$id"
          params={{ id: task.id }}
          data-task-title={task.id}
          aria-current={selected ? "true" : undefined}
          onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
            if (!panel?.enabled || !isPlainClick(event)) return;
            event.preventDefault();
            panel.open(task.id);
          }}
          className={cn(
            "text-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:underline",
            selected && "font-semibold",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[0.8125rem] text-muted-foreground">
          {task.status === "delegated" ? <Badge variant="outline">Delegated</Badge> : null}
          <TaskDue task={task} today={today} />
          {showProject && task.projectTitle && task.projectId ? (
            <span className="min-w-0 break-words">
              {task.dueDate || task.revisitDate ? "· " : ""}
              {task.projectTitle}
            </span>
          ) : null}
        </p>
      </div>
      <TaskActionsMenu task={task} today={today} projects={projects} reorder={reorder} />
    </li>
  );
}
