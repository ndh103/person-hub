import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@/components/link";
import { cn } from "@/lib/utils";
import { formatDuration, type LocalDate } from "../../domain/dates";
import { finisherQueries } from "../../api";
import type { ProjectOption, SessionItem, TaskItem } from "../../types";
import { AddTaskButton } from "../add-task-button";
import { CollapsibleSection } from "../collapsible-section";
import { EmptyState, ListSection, NewProjectLink, RowList } from "../list-parts";
import { SessionCheck } from "../session-control";
import { SortableTaskList } from "../sortable-task-list";
import { useTaskPanel } from "../task-panel-context";
import { TaskRow } from "../task-row";

/** Overdue or Due today, in the user's order and reorderable (FIN-031, FIN-038). */
function SortableSection(props: { section: string; tasks: TaskItem[]; today: LocalDate; projects: ProjectOption[] }) {
  // Start again from the server's list whenever it changes (after any write).
  return <SortableSectionInner key={props.tasks.map((task) => task.id).join(",")} {...props} />;
}

function SortableSectionInner({ section, tasks, today, projects }: { section: string; tasks: TaskItem[]; today: LocalDate; projects: ProjectOption[] }) {
  const [items, setItems] = useState(tasks);
  return <SortableTaskList section={section} items={items} onItemsChange={setItems} today={today} projects={projects} />;
}

function SessionRow({ session }: { session: SessionItem }) {
  return (
    <li className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{session.activity}</p>
        <p className="font-mono text-[0.8125rem] break-words text-muted-foreground">
          <Link to="/finisher/projects/$id" params={{ id: session.projectId }} className="underline-offset-4 hover:underline">
            {session.projectTitle}
          </Link>
          {" · "}
          {formatDuration(session.durationMinutes)}
          {session.startTime ? ` · ${session.startTime}` : ""}
        </p>
      </div>
      <SessionCheck slotId={session.slotId} date={session.date} state={session.state} activity={session.activity} />
    </li>
  );
}

/** FIN-031: sessions today, overdue, due today, then a collapsed Done today group. */
export function TodayView() {
  const { data } = useSuspenseQuery(finisherQueries.today());
  const { now } = data;
  // With the side panel open there is room for one column only (FIN-036).
  const panelOpen = Boolean(useTaskPanel()?.selectedId);
  const overdueCount = data.overdue.length;
  const revisitTotal = data.revisitDue.tasks + data.revisitDue.projects;
  const nothingToday =
    data.sessionsTotal === 0 && overdueCount === 0 && data.dueToday.length === 0 && data.doneTasks.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The "Today · 13 Oct 2026" line is in the Finisher header (tabs-layout.tsx). */}
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[0.8125rem] text-muted-foreground" role="status">
          {data.sessionsDone} of {data.sessionsTotal} {data.sessionsTotal === 1 ? "session" : "sessions"} done today ·{" "}
          {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
        </p>
        {revisitTotal > 0 ? (
          <p className="text-sm">
            <Link
              to={data.revisitDue.tasks > 0 ? "/finisher/tasks" : "/finisher/projects"}
              hash="parked"
              className="font-medium text-accent-foreground underline underline-offset-4"
            >
              {revisitTotal} parked {revisitTotal === 1 ? "item is" : "items are"} due for revisit
            </Link>
          </p>
        ) : null}
      </div>

      {nothingToday ? (
        <EmptyState
          title="Nothing scheduled today"
          description="Add a task you need to finish, or start a project and give it time slots in your week."
        >
          <AddTaskButton today={now.date} projects={data.projects} />
          <NewProjectLink />
        </EmptyState>
      ) : (
        <div className={cn("grid gap-6", !panelOpen && "lg:grid-cols-2 lg:items-start")}>
          <ListSection title="Sessions today" id="sessions">
            {data.sessions.length ? (
              <RowList>
                {data.sessions.map((session) => (
                  <SessionRow key={session.slotId} session={session} />
                ))}
              </RowList>
            ) : (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                {data.sessionsTotal ? "All of today’s sessions are marked." : "No sessions scheduled today."}
              </p>
            )}
          </ListSection>

          <div className="flex flex-col gap-6">
            {overdueCount ? (
              <ListSection title="Overdue" id="overdue">
                <SortableSection section="Overdue" tasks={data.overdue} today={now.date} projects={data.projects} />
              </ListSection>
            ) : null}
            <ListSection title="Due today" id="due-today">
              {data.dueToday.length ? (
                <SortableSection section="Due today" tasks={data.dueToday} today={now.date} projects={data.projects} />
              ) : (
                <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No tasks due today.</p>
              )}
            </ListSection>
          </div>
        </div>
      )}

      {data.doneSessions.length + data.doneTasks.length > 0 ? (
        <CollapsibleSection title="Done today" count={data.doneSessions.length + data.doneTasks.length}>
          <RowList>
            {data.doneSessions.map((session) => (
              <SessionRow key={session.slotId} session={session} />
            ))}
            {data.doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} today={now.date} projects={data.projects} />
            ))}
          </RowList>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
