import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  addDays,
  formatFullDate,
  formatRelativeDate,
  formatShortDate,
  isoWeekday,
  weekdayShort,
} from "../../domain/dates";
import { formatWeekDetails, formatWeekRate } from "../../domain/schedule";
import { getProject } from "../../server/queries";
import type { ProjectDetail, ProjectStatus } from "../../types";
import { AddTaskButton } from "../add-task-button";
import { ListSection, RowList } from "../list-parts";
import { ProjectActions } from "../project-actions";
import { StripCell } from "../session-control";
import { SlotList } from "../slot-list";
import { TaskRow } from "../task-row";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  parked: "Parked",
  finished: "Finished",
  let_go: "Let go",
};

function Strip({ project }: { project: ProjectDetail }) {
  const today = project.now.date;
  if (project.strip.length === 0) {
    return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No sessions in the last 7 days.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {project.strip.map((row) => (
        <div key={row.slotId} role="group" aria-label={`${row.activity}, last 8 days`} className="flex flex-col gap-2">
          <p className="text-sm font-medium break-words">
            {row.activity}
            {row.removed ? <span className="font-normal text-muted-foreground"> (removed)</span> : null}
          </p>
          <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {row.cells.map((cell) => {
              const dayLabel = cell.date === today ? "Today" : `${weekdayShort(isoWeekday(cell.date))} ${Number(cell.date.slice(8))}`;
              return (
                <li key={cell.date}>
                  {cell.state === null ? (
                    <div className="flex h-14 flex-col items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                      <span aria-hidden="true">{dayLabel}</span>
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">{formatFullDate(cell.date)}: no session</span>
                    </div>
                  ) : (
                    <StripCell
                      slotId={row.slotId}
                      date={cell.date}
                      state={cell.state}
                      activity={row.activity}
                      dayLabel={dayLabel}
                      fullDate={formatFullDate(cell.date)}
                      disabled={!cell.markable}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Sessions can be marked for today and the 7 days before. Older unmarked sessions count as missed.
      </p>
    </div>
  );
}

function Weeks({ project }: { project: ProjectDetail }) {
  return (
    <RowList label="Weekly follow-through">
      {project.weeks.map((week, index) => (
        <li key={week.weekStart} className="flex flex-col gap-0.5 p-3 sm:p-4">
          <p className="text-sm font-medium">
            {index === 0 ? "This week" : `Week of ${formatShortDate(week.weekStart)}`}
            <span className="sr-only">
              {" "}
              ({formatFullDate(week.weekStart)} to {formatFullDate(addDays(week.weekStart, 6))})
            </span>
          </p>
          <p className="text-sm">{formatWeekRate(week, "")}</p>
          {formatWeekDetails(week) ? <p className="text-sm text-muted-foreground">{formatWeekDetails(week)}</p> : null}
        </li>
      ))}
    </RowList>
  );
}

/** FIN-024: project details, slots, 7-day strip, weekly rates and tasks. */
export async function ProjectView({ id }: { id: string }) {
  const project = await getProject(id);
  if (!project) notFound();
  const today = project.now.date;
  const open = project.status === "active" || project.status === "parked";

  return (
    <article aria-labelledby="project-title" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/finisher/projects"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Projects
        </Link>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="project-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight break-words outline-none">
              {project.title}
            </h1>
            <Badge variant={open ? "secondary" : "outline"}>{STATUS_LABEL[project.status]}</Badge>
          </div>
          {project.goal ? <p className="max-w-prose text-sm break-words">{project.goal}</p> : null}
          <dl className="grid max-w-prose gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Done when</dt>
            <dd className="break-words">{project.doneWhen}</dd>
            {project.targetDate ? (
              <>
                <dt className="text-muted-foreground">Target date</dt>
                <dd>
                  <time dateTime={project.targetDate}>{formatFullDate(project.targetDate)}</time>
                </dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Started</dt>
            <dd>
              <time dateTime={project.startedOn}>{formatFullDate(project.startedOn)}</time>
            </dd>
            {project.status === "parked" && project.revisitDate ? (
              <>
                <dt className="text-muted-foreground">Revisit</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <time dateTime={project.revisitDate}>{formatRelativeDate(project.revisitDate, today)}</time>
                  {project.revisitDate <= today ? <Badge variant="secondary">Due for revisit</Badge> : null}
                </dd>
              </>
            ) : null}
            {project.closedOn ? (
              <>
                <dt className="text-muted-foreground">Closed</dt>
                <dd>
                  <time dateTime={project.closedOn}>{formatFullDate(project.closedOn)}</time>
                </dd>
              </>
            ) : null}
            {project.note ? (
              <>
                <dt className="text-muted-foreground">{project.status === "let_go" ? "Reason" : "Reflection"}</dt>
                <dd className="break-words">{project.note}</dd>
              </>
            ) : null}
          </dl>
        </div>
        <ProjectActions
          project={{
            id: project.id,
            title: project.title,
            status: project.status,
            doneWhen: project.doneWhen,
            revisitDate: project.revisitDate,
          }}
          today={today}
          openTasks={project.openTasks.filter((task) => task.status === "open").length}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-8">
          <ListSection title="Weekly slots" id="slots">
            <SlotList projectId={project.id} slots={project.slots} editable={open} />
          </ListSection>
          <ListSection title="Last 7 days" id="strip">
            <Strip project={project} />
          </ListSection>
          <ListSection title="Weekly follow-through" id="weeks">
            <Weeks project={project} />
          </ListSection>
        </div>
        <div className="flex flex-col gap-8">
          <ListSection title="Open tasks" id="tasks">
            <div className="flex flex-col gap-2">
              {project.openTasks.length ? (
                <RowList>
                  {project.openTasks.map((task) => (
                    <TaskRow key={task.id} task={task} today={today} projects={project.projects} showProject={false} />
                  ))}
                </RowList>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No open tasks for this project.</p>
              )}
              {open ? (
                <div>
                  <AddTaskButton today={today} projects={project.projects} projectId={project.id} variant="outline" />
                </div>
              ) : null}
            </div>
          </ListSection>
          {project.closedTasks.length ? (
            <ListSection title="Closed tasks" id="closed-tasks">
              <RowList>
                {project.closedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} today={today} projects={project.projects} showProject={false} />
                ))}
              </RowList>
            </ListSection>
          ) : null}
        </div>
      </div>
    </article>
  );
}
