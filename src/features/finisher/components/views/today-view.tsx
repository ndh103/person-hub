import Link from "next/link";
import { formatDuration, formatFullDate } from "../../domain/dates";
import { getToday } from "../../server/queries";
import type { SessionItem } from "../../types";
import { AddTaskButton } from "../add-task-button";
import { CollapsibleSection } from "../collapsible-section";
import { EmptyState, ListSection, NewProjectLink, RowList } from "../list-parts";
import { SessionCheck } from "../session-control";
import { TaskRow } from "../task-row";

function SessionRow({ session }: { session: SessionItem }) {
  return (
    <li className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{session.activity}</p>
        <p className="text-sm break-words text-muted-foreground">
          <Link href={`/finisher/projects/${session.projectId}`} className="underline-offset-4 hover:underline">
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
export async function TodayView() {
  const data = await getToday();
  const { now } = data;
  const overdueCount = data.overdue.length;
  const revisitTotal = data.revisitDue.tasks + data.revisitDue.projects;
  const nothingToday =
    data.sessionsTotal === 0 && overdueCount === 0 && data.dueToday.length === 0 && data.doneTasks.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Today · <time dateTime={now.date}>{formatFullDate(now.date)}</time>
        </p>
        <p className="text-sm text-muted-foreground" role="status">
          {data.sessionsDone} of {data.sessionsTotal} {data.sessionsTotal === 1 ? "session" : "sessions"} done today ·{" "}
          {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
        </p>
        {revisitTotal > 0 ? (
          <p className="text-sm">
            <Link
              href={data.revisitDue.tasks > 0 ? "/finisher/tasks#parked" : "/finisher/projects#parked"}
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
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <ListSection title="Sessions today" id="sessions">
            {data.sessions.length ? (
              <RowList>
                {data.sessions.map((session) => (
                  <SessionRow key={session.slotId} session={session} />
                ))}
              </RowList>
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {data.sessionsTotal ? "All of today’s sessions are marked." : "No sessions scheduled today."}
              </p>
            )}
          </ListSection>

          <div className="flex flex-col gap-6">
            {overdueCount ? (
              <ListSection title="Overdue" id="overdue">
                <RowList>
                  {data.overdue.map((task) => (
                    <TaskRow key={task.id} task={task} today={now.date} projects={data.projects} />
                  ))}
                </RowList>
              </ListSection>
            ) : null}
            <ListSection title="Due today" id="due-today">
              {data.dueToday.length ? (
                <RowList>
                  {data.dueToday.map((task) => (
                    <TaskRow key={task.id} task={task} today={now.date} projects={data.projects} />
                  ))}
                </RowList>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No tasks due today.</p>
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
