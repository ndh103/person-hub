"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontalIcon, PartyPopperIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { finisherApi } from "../api";
import type { LocalDate } from "../domain/dates";
import { generalErrorMessage } from "../messages";
import type { ProjectStatus } from "../types";
import { DeleteDialog, FinishDialog, LetGoDialog, ParkDialog, ReopenProjectDialog } from "./lifecycle-dialogs";

type Dialog = "finish" | "park" | "letgo" | "delete" | "reopen" | null;

/** FIN-024 actions, as the project's status allows. Secondary actions sit in a menu (FIN-018). */
export function ProjectActions({
  project,
  today,
  openTasks,
}: {
  project: { id: string; title: string; status: ProjectStatus; doneWhen: string; revisitDate: LocalDate | null };
  today: LocalDate;
  openTasks: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const open = project.status === "active" || project.status === "parked";
  const toggle = (name: Exclude<Dialog, null>) => (next: boolean) => setDialog(next ? name : null);

  async function unpark() {
    const result = await finisherApi("POST", `/api/finisher/projects/${project.id}/actions`, { action: "unpark" });
    if (!result.ok) {
      toast.add({ title: "Couldn’t unpark the project", description: generalErrorMessage(result.error), type: "error" });
      return;
    }
    toast.add({ title: `“${project.title}” is active again`, type: "success" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {open ? (
        <Button className="h-11" onClick={() => setDialog("finish")}>
          <PartyPopperIcon data-icon="inline-start" />
          Finish
        </Button>
      ) : (
        <Button className="h-11" onClick={() => setDialog("reopen")}>
          <RotateCcwIcon data-icon="inline-start" />
          Reopen
        </Button>
      )}
      {project.status === "parked" ? (
        <Button variant="outline" className="h-11" onClick={() => void unpark()}>
          Unpark
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-lg" className="size-11" aria-label="More project actions" />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {open ? (
            <DropdownMenuGroup>
              <DropdownMenuItem className="min-h-11" render={<Link href={`/finisher/projects/${project.id}/edit`} />}>
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11" onClick={() => setDialog("park")}>
                {project.status === "parked" ? "Change revisit date" : "Park"}
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11" onClick={() => setDialog("letgo")}>
                Let go
              </DropdownMenuItem>
            </DropdownMenuGroup>
          ) : null}
          {open ? <DropdownMenuSeparator /> : null}
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" className="min-h-11" onClick={() => setDialog("delete")}>
              Delete project
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FinishDialog
        open={dialog === "finish"}
        onOpenChange={toggle("finish")}
        id={project.id}
        title={project.title}
        doneWhen={project.doneWhen}
        openTasks={openTasks}
      />
      <ParkDialog
        open={dialog === "park"}
        onOpenChange={toggle("park")}
        kind="project"
        id={project.id}
        title={project.title}
        today={today}
        current={project.status === "parked" ? project.revisitDate : null}
      />
      <LetGoDialog open={dialog === "letgo"} onOpenChange={toggle("letgo")} kind="project" id={project.id} title={project.title} />
      <ReopenProjectDialog open={dialog === "reopen"} onOpenChange={toggle("reopen")} id={project.id} title={project.title} />
      <DeleteDialog
        open={dialog === "delete"}
        onOpenChange={toggle("delete")}
        kind="project"
        id={project.id}
        title={project.title}
        onDeleted={() => {
          router.replace("/finisher/projects");
          router.refresh();
        }}
      />
    </div>
  );
}
