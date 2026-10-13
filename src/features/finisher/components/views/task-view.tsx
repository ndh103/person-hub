import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@/components/link";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "../../domain/dates";
import { finisherQueries } from "../../api";
import type { TaskStatus } from "../../types";
import { NotFoundState } from "../list-parts";
import { TaskActionsMenu, TaskCheck, TaskDue } from "../task-row";

const STATUS_LABEL: Record<TaskStatus, string> = { open: "Open", parked: "Parked", done: "Done", let_go: "Let go" };

/** FIN-020: a task's details. Done and Let go tasks are read-only apart from Reopen and Delete. */
export function TaskView({ id }: { id: string }) {
  const { data } = useSuspenseQuery(finisherQueries.task(id));
  if (!data) return <NotFoundState kind="task" />;
  const { task, projects, today: todayDate } = data;

  return (
    <article aria-labelledby="task-title" className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/finisher/tasks"
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Tasks
      </Link>
      <div className="flex items-start gap-3">
        {task.status !== "let_go" ? <TaskCheck task={task} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="task-title" tabIndex={-1} className="font-heading text-3xl font-medium lg:text-4xl break-words outline-none">
              {task.title}
            </h1>
            <Badge variant={task.status === "open" ? "secondary" : "outline"}>{STATUS_LABEL[task.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <TaskDue task={task} today={todayDate} />
          </p>
        </div>
        <TaskActionsMenu task={task} today={todayDate} projects={projects} editTask={task} deleteRedirect="/finisher/tasks" />
      </div>

      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Notes</dt>
        <dd className="break-words whitespace-pre-line">{task.notes ?? "—"}</dd>
        <dt className="text-muted-foreground">Due</dt>
        <dd>
          {task.dueDate ? (
            <time dateTime={task.dueDate}>
              {formatDate(task.dueDate)}
              {task.dueTime ? ` at ${task.dueTime}` : ""}
            </time>
          ) : (
            "No due date"
          )}
        </dd>
        <dt className="text-muted-foreground">Project</dt>
        <dd className="break-words">
          {task.projectId && task.projectTitle ? (
            <Link to="/finisher/projects/$id" params={{ id: task.projectId }} className="text-accent-foreground underline underline-offset-4">
              {task.projectTitle}
            </Link>
          ) : (
            "No project"
          )}
        </dd>
        <dt className="text-muted-foreground">Created</dt>
        <dd>
          <time dateTime={task.createdOn}>{formatDate(task.createdOn)}</time>
        </dd>
        {task.closedOn ? (
          <>
            <dt className="text-muted-foreground">{task.status === "done" ? "Done" : "Closed"}</dt>
            <dd>
              <time dateTime={task.closedOn}>{formatDate(task.closedOn)}</time>
            </dd>
          </>
        ) : null}
        {task.reason ? (
          <>
            <dt className="text-muted-foreground">Reason for letting go</dt>
            <dd className="break-words">{task.reason}</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}
