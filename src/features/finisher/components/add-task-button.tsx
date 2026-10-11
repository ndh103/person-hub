import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LocalDate } from "../domain/dates";
import type { ProjectOption } from "../types";
import { TaskFormDialog } from "./task-form-dialog";

/** "Add task" from any Finisher view (FIN-019); a project page preselects itself. */
export function AddTaskButton({
  today,
  projects,
  projectId,
  variant = "default",
}: {
  today: LocalDate;
  projects: ProjectOption[];
  projectId?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} className="h-11 px-4" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Add task
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} today={today} projects={projects} defaultProjectId={projectId} />
    </>
  );
}
