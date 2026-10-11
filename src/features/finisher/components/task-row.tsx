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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { finisherApi } from "../api";
import { formatFullDate, formatRelativeDate, type LocalDate } from "../domain/dates";
import { generalErrorMessage } from "../messages";
import type { ProjectOption, TaskDetail, TaskItem } from "../types";
import { DeleteDialog, LetGoDialog, ParkDialog } from "./lifecycle-dialogs";
import { TaskFormDialog } from "./task-form-dialog";
import { useFinisherRefresh } from "./use-refresh";

/** Due wording, e.g. "Overdue · due Wed 7 Oct" or "Due today · 17:00"; full date for assistive tech. */
export function TaskDue({ task, today }: { task: TaskItem; today: LocalDate }) {
  if (task.status === "parked" && task.revisitDate) {
    const due = task.revisitDate <= today;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2">
        {due ? <Badge variant="secondary">Due for revisit</Badge> : null}
        <span>
          Revisit <time dateTime={task.revisitDate}>{formatRelativeDate(task.revisitDate, today)}</time>
          <span className="sr-only"> ({formatFullDate(task.revisitDate)})</span>
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
      <span className="sr-only"> ({formatFullDate(task.dueDate)})</span>
    </span>
  );
}

/**
 * Check-off control (FIN-021): a real button that announces its pressed
 * state. Completing is optimistic; failure reverts it with a message, and
 * success offers Undo (reopen).
 */
export function TaskCheck({ task }: { task: TaskItem }) {
  const refresh = useFinisherRefresh();
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const done = optimisticDone ?? task.status === "done";

  async function setDone(next: boolean) {
    setBusy(true);
    setOptimisticDone(next);
    const result = await finisherApi("POST", `/api/finisher/tasks/${task.id}/actions`, { action: next ? "done" : "reopen" });
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
        actionProps: { children: "Undo", onClick: () => void setDone(false) },
      });
    }
    void refresh().finally(() => setOptimisticDone(null));
  }

  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={done}
      aria-label={`Mark “${task.title}” done`}
      disabled={busy}
      className="size-11 shrink-0 rounded-full aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
      onClick={() => void setDone(!done)}
    >
      {done ? <CheckIcon /> : <CircleIcon className="text-muted-foreground" />}
    </Button>
  );
}

type OpenDialog = "edit" | "park" | "letgo" | "delete" | null;

/** Per-item menu with secondary actions (FIN-018). */
export function TaskActionsMenu({
  task,
  today,
  projects,
  editTask,
  deleteRedirect,
}: {
  task: TaskItem;
  today: LocalDate;
  projects: ProjectOption[];
  /** Detail data for Edit; when absent, Edit links to the task page. */
  editTask?: TaskDetail;
  /** Where to go after deleting (the task page itself would no longer exist). */
  deleteRedirect?: "/finisher/tasks";
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-lg" className="size-11 shrink-0" aria-label={`More actions for “${task.title}”`} />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            {open ? (
              editTask ? (
                <DropdownMenuItem className="min-h-11" onClick={() => setDialog("edit")}>
                  Edit
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="min-h-11" render={<Link to="/finisher/tasks/$id" params={{ id: task.id }} />}>
                  Open and edit
                </DropdownMenuItem>
              )
            ) : null}
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
            : undefined
        }
      />
    </>
  );
}

/** One task in a list: check-off, title (links to details), due and project, actions. */
export function TaskRow({
  task,
  today,
  projects,
  showProject = true,
}: {
  task: TaskItem;
  today: LocalDate;
  projects: ProjectOption[];
  showProject?: boolean;
}) {
  const closable = task.status === "open" || task.status === "parked" || task.status === "done";
  return (
    <li className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      {closable ? <TaskCheck task={task} /> : null}
      <div className="min-w-0 flex-1">
        <Link
          to="/finisher/tasks/$id"
          params={{ id: task.id }}
          className={cn(
            "font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:underline",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </Link>
        <p className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
          <TaskDue task={task} today={today} />
          {showProject && task.projectTitle && task.projectId ? (
            <span className="min-w-0 break-words">
              {task.dueDate || task.revisitDate ? "· " : ""}
              {task.projectTitle}
            </span>
          ) : null}
        </p>
      </div>
      <TaskActionsMenu task={task} today={today} projects={projects} />
    </li>
  );
}
