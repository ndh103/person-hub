"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FormAlert } from "@/features/auth/components/form-alert";
import { finisherApi } from "../api";
import { parseTaskInput, LIMITS } from "../domain/validation";
import type { LocalDate } from "../domain/dates";
import type { ProjectOption, TaskDetail } from "../types";
import { focusFirstInvalid, FormField } from "./form-field";
import { useMutation } from "./use-mutation";

type Values = { title: string; notes: string; dueDate: string; dueTime: string; projectId: string };

function initialValues(task: TaskDetail | undefined, projectId: string | undefined): Values {
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    dueDate: task?.dueDate ?? "",
    dueTime: task?.dueTime ?? "",
    projectId: task?.projectId ?? projectId ?? "",
  };
}

/** Add task (FIN-019) and edit task (FIN-020). Values survive errors for a retry. */
export function TaskFormDialog({
  open,
  onOpenChange,
  today,
  projects,
  task,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: LocalDate;
  projects: ProjectOption[];
  task?: TaskDetail;
  defaultProjectId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => initialValues(task, defaultProjectId));
  const { run, pending, fieldErrors, setFieldErrors, formError, reset } = useMutation();
  const editing = Boolean(task);

  // A linked project that has since closed stays selectable while editing (assumption A4).
  const options =
    task?.projectId && !projects.some((project) => project.id === task.projectId)
      ? [...projects, { id: task.projectId, title: task.projectTitle ?? "Closed project", status: "finished" as const }]
      : projects;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      if (!editing) setValues(initialValues(undefined, defaultProjectId));
    } else {
      setValues(initialValues(task, defaultProjectId));
    }
    onOpenChange(next);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = parseTaskInput(values, today);
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      focusFirstInvalid(formRef.current);
      return;
    }
    const result = editing
      ? await run(() => finisherApi("PATCH", `/api/finisher/tasks/${task!.id}`, parsed.value))
      : await run(() => finisherApi("POST", "/api/finisher/tasks", parsed.value));
    if (!result.ok) {
      focusFirstInvalid(formRef.current);
      return;
    }
    toast.add({ title: editing ? "Task saved" : "Task added", type: "success" });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "Add task"}</DialogTitle>
          <DialogDescription>A short, one-off thing to get done.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
            <FormField name="title" label="Title" errors={fieldErrors}>
              {(props) => (
                <Input
                  {...props}
                  className="h-11"
                  value={values.title}
                  maxLength={LIMITS.title + 20}
                  autoComplete="off"
                  onChange={(event) => set("title", event.target.value)}
                />
              )}
            </FormField>
            <FormField name="notes" label="Notes" optional errors={fieldErrors}>
              {(props) => (
                <Textarea {...props} value={values.notes} rows={3} onChange={(event) => set("notes", event.target.value)} />
              )}
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField name="dueDate" label="Due date" optional errors={fieldErrors}>
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    className="h-11"
                    value={values.dueDate}
                    onChange={(event) => set("dueDate", event.target.value)}
                  />
                )}
              </FormField>
              <FormField name="dueTime" label="Due time" optional errors={fieldErrors} description="Needs a due date.">
                {(props) => (
                  <Input
                    {...props}
                    type="time"
                    className="h-11"
                    value={values.dueTime}
                    onChange={(event) => set("dueTime", event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <FormField name="projectId" label="Project" optional errors={fieldErrors}>
              {(props) => (
                <NativeSelect
                  {...props}
                  className="w-full [&_select]:h-11"
                  value={values.projectId}
                  onChange={(event) => set("projectId", event.target.value)}
                >
                  <NativeSelectOption value="">No project</NativeSelectOption>
                  {options.map((project) => (
                    <NativeSelectOption key={project.id} value={project.id}>
                      {project.title}
                      {project.status === "parked" ? " (parked)" : project.status !== "active" ? " (closed)" : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" className="h-11" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {editing ? "Save task" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
