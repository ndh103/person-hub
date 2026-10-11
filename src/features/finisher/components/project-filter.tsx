import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import type { ProjectFilter as Filter, ProjectOption } from "../types";

/** FIN-022 filter: All, one project, or No project. Kept in the URL (?project=). */
export function ProjectFilter({ value, projects }: { value: Filter; projects: ProjectOption[] }) {
  const id = useId();
  const navigate = useNavigate();
  const pending = useRouterState({ select: (state) => state.status === "pending" });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={id}>Project</Label>
      <NativeSelect
        id={id}
        className="w-full sm:w-64 [&_select]:h-11"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          void navigate({ to: "/finisher/tasks", search: next === "all" ? {} : { project: next } });
        }}
      >
        <NativeSelectOption value="all">All tasks</NativeSelectOption>
        <NativeSelectOption value="none">No project</NativeSelectOption>
        {projects.map((project) => (
          <NativeSelectOption key={project.id} value={project.id}>
            {project.title}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {pending ? <Spinner aria-label="Loading tasks" /> : null}
    </div>
  );
}
