import { useSuspenseQuery } from "@tanstack/react-query";
import { finisherQueries } from "../../api";
import type { TaskGroupKey } from "../../types";
import { AddTaskButton } from "../add-task-button";
import { CollapsibleSection } from "../collapsible-section";
import { EmptyState, ListSection } from "../list-parts";
import { ProjectFilter } from "../project-filter";
import { TaskGroupList } from "../task-group-list";

const OPEN_GROUPS: { key: TaskGroupKey; title: string }[] = [
  { key: "overdue", title: "Overdue" },
  { key: "today", title: "Today" },
  { key: "upcoming", title: "Upcoming" },
  { key: "nodate", title: "No date" },
];

/** FIN-022: open tasks grouped by due date, then a collapsed Parked group. */
export function TasksView({ project }: { project?: string }) {
  const { data } = useSuspenseQuery(finisherQueries.tasks(project));
  const { now, groups } = data;
  const parked = groups.parked;
  const anyOpen = OPEN_GROUPS.some((group) => groups[group.key].items.length > 0);
  const parkedDue = parked.items.filter((task) => task.revisitDate !== null && task.revisitDate <= now.date).length;

  return (
    <div className="flex flex-col gap-6">
      <ProjectFilter value={data.filter} projects={data.projects} />

      {!anyOpen ? (
        <EmptyState
          title="No open tasks"
          description={
            data.filter === "all" ? "Add something short you want to get done." : "No open tasks match this filter."
          }
        >
          <AddTaskButton today={now.date} projects={data.projects} />
        </EmptyState>
      ) : (
        OPEN_GROUPS.filter((group) => groups[group.key].items.length > 0).map((group) => (
          <ListSection key={group.key} title={group.title} id={`group-${group.key}`}>
            <TaskGroupList
              group={group.key}
              label={group.title}
              filter={data.filter}
              page={groups[group.key]}
              today={now.date}
              projects={data.projects}
            />
          </ListSection>
        ))
      )}

      {parked.items.length ? (
        <CollapsibleSection
          id="parked"
          title={parkedDue ? `Parked · ${parkedDue} due for revisit` : "Parked"}
          count={parked.nextOffset !== null ? `${parked.items.length}+` : parked.items.length}
          defaultOpen={parkedDue > 0}
        >
          <TaskGroupList group="parked" label="Parked" filter={data.filter} page={parked} today={now.date} projects={data.projects} />
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
