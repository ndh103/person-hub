import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatFullDate, formatRelativeDate } from "../../domain/dates";
import { formatWeekDetails, formatWeekRate } from "../../domain/schedule";
import { getProjectsTab } from "../../server/queries";
import type { ProjectCard } from "../../types";
import { CollapsibleSection } from "../collapsible-section";
import { EmptyState, ListSection, NewProjectLink, RowList } from "../list-parts";

function ProjectRow({ project, today }: { project: ProjectCard; today: string }) {
  const parked = project.status === "parked";
  return (
    <li>
      <Link
        href={`/finisher/projects/${project.id}`}
        className="flex flex-col gap-1 p-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="font-medium break-words">{project.title}</span>
        {parked && project.revisitDate ? (
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {project.revisitDate <= today ? <Badge variant="secondary">Due for revisit</Badge> : null}
            <span>
              Revisit <time dateTime={project.revisitDate}>{formatRelativeDate(project.revisitDate, today)}</time>
              <span className="sr-only"> ({formatFullDate(project.revisitDate)})</span>
            </span>
          </span>
        ) : (
          <>
            <span className="text-sm">{formatWeekRate(project.week)}</span>
            <span className="text-sm text-muted-foreground">
              {[
                formatWeekDetails(project.week),
                project.todaySessions.total
                  ? `${project.todaySessions.done} of ${project.todaySessions.total} today`
                  : "No sessions today",
                `${project.openTasks} open ${project.openTasks === 1 ? "task" : "tasks"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        )}
      </Link>
    </li>
  );
}

/** FIN-033: Active projects with this week's rate, then a collapsed Parked group. */
export async function ProjectsView() {
  const data = await getProjectsTab();
  const today = data.now.date;
  const parkedDue = data.parked.filter((project) => project.revisitDate !== null && project.revisitDate <= today).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <NewProjectLink variant="default" />
      </div>
      {data.active.length === 0 && data.parked.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="A project is for something bigger that needs regular time, like teaching your daughter English three evenings a week."
        >
          <NewProjectLink variant="default" />
        </EmptyState>
      ) : data.active.length ? (
        <ListSection title="Active" id="active">
          <RowList>
            {data.active.map((project) => (
              <ProjectRow key={project.id} project={project} today={today} />
            ))}
          </RowList>
        </ListSection>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No active projects.</p>
      )}
      {data.parked.length ? (
        <CollapsibleSection
          id="parked"
          title={parkedDue ? `Parked · ${parkedDue} due for revisit` : "Parked"}
          count={data.parked.length}
          defaultOpen={parkedDue > 0}
        >
          <RowList>
            {data.parked.map((project) => (
              <ProjectRow key={project.id} project={project} today={today} />
            ))}
          </RowList>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
