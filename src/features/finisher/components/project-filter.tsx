import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ProjectFilter as Filter, ProjectOption } from "../types";

/** FIN-022 filter: All, one project, or No project. Kept in the URL (?project=). */
export function ProjectFilter({ value, projects }: { value: Filter; projects: ProjectOption[] }) {
  const id = useId();
  const navigate = useNavigate();
  const pending = useRouterState({ select: (state) => state.status === "pending" });
  const items = [
    { value: "all", label: "All tasks" },
    { value: "none", label: "No project" },
    ...projects.map((project) => ({ value: project.id, label: project.title })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={id}>Project</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next === null) return;
          void navigate({ to: "/finisher/tasks", search: next === "all" ? {} : { project: next } });
        }}
      >
        <SelectTrigger id={id} className="h-11 w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? <Spinner aria-label="Loading tasks" /> : null}
    </div>
  );
}
