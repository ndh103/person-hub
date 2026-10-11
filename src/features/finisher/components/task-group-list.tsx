"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { finisherApi } from "../api";
import type { LocalDate } from "../domain/dates";
import { generalErrorMessage } from "../messages";
import type { ProjectFilter, ProjectOption, TaskGroupKey, TaskItem, TaskPage } from "../types";
import { RowList } from "./list-parts";
import { TaskRow } from "./task-row";

/** A task group with "Load more" (50 at a time, FIN-022). */
export function TaskGroupList(props: {
  group: TaskGroupKey;
  label: string;
  filter: ProjectFilter;
  page: TaskPage;
  today: LocalDate;
  projects: ProjectOption[];
}) {
  // Restart from the server's first page whenever it changes (after a refresh).
  const key = props.page.items.map((item) => item.id).join(",") + props.filter;
  return <TaskGroupListInner key={key} {...props} />;
}

function TaskGroupListInner({
  group,
  label,
  filter,
  page,
  today,
  projects,
}: {
  group: TaskGroupKey;
  label: string;
  filter: ProjectFilter;
  page: TaskPage;
  today: LocalDate;
  projects: ProjectOption[];
}) {
  const [items, setItems] = useState<TaskItem[]>(page.items);
  const [next, setNext] = useState(page.nextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (next === null) return;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ group, project: filter, offset: String(next) });
    const result = await finisherApi<TaskPage>("GET", `/api/finisher/tasks?${query}`);
    setLoading(false);
    if (!result.ok) {
      setError(generalErrorMessage(result.error));
      return;
    }
    setItems((current) => [...current, ...result.data.items.filter((item) => !current.some((c) => c.id === item.id))]);
    setNext(result.data.nextOffset);
  }

  return (
    <div className="flex flex-col gap-2">
      <RowList label={label}>
        {items.map((task) => (
          <TaskRow key={task.id} task={task} today={today} projects={projects} />
        ))}
      </RowList>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {next !== null ? (
        <Button variant="outline" className="h-11 self-start" disabled={loading} onClick={loadMore}>
          {loading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}
