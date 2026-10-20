import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FormAlert } from "@/features/auth/components/form-alert";
import { browserTimeZone, finisherApi } from "../api";
import { parseTaskInput, LIMITS } from "../domain/validation";
import { DEFAULT_TIME_ZONE, formatDate, formatWeekdayDate, zonedNow, type LocalDate } from "../domain/dates";
import { QUICK_DUE_KINDS, QUICK_DUE_LABELS, quickDueDate, type QuickDueKind } from "../domain/quick-due";
import type { ProjectOption, TaskDetail } from "../types";
import { DatePicker } from "@/components/forms/date-picker";
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
  const [announcement, setAnnouncement] = useState("");
  const editing = Boolean(task);

  // A linked project that has since closed stays selectable while editing (assumption A4).
  const options =
    task?.projectId && !projects.some((project) => project.id === task.projectId)
      ? [...projects, { id: task.projectId, title: task.projectTitle ?? "Closed project", status: "finished" as const }]
      : projects;
  const projectItems: { value: string | null; label: string }[] = [
    { value: null, label: "No project" },
    ...options.map((project) => ({
      value: project.id,
      label:
        project.title +
        (project.status === "parked" ? " (parked)" : project.status !== "active" ? " (closed)" : ""),
    })),
  ];

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /**
   * FIN-034: fill the due date in one tap. "Today" is read when the button is
   * pressed, so a dialog left open past midnight uses the new date. Only the
   * due date changes; nothing is submitted.
   */
  function applyShortcut(kind: QuickDueKind) {
    const current = zonedNow(browserTimeZone() ?? DEFAULT_TIME_ZONE).date;
    const date = quickDueDate(kind, current);
    set("dueDate", date);
    setFieldErrors((errors) => {
      const next = { ...errors };
      delete next.dueDate;
      if (next.dueTime === "needs_date") delete next.dueTime;
      return next;
    });
    setAnnouncement(`Due date set to ${formatDate(date)}.`);
  }

  function handleOpenChange(next: boolean) {
    setAnnouncement("");
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
            <FormField name="dueDate" label="Due date" optional errors={fieldErrors}>
              {(props) => (
                <>
                  <DatePicker
                    control={props}
                    label="Due date"
                    value={values.dueDate}
                    onChange={(date) => set("dueDate", date)}
                    today={today}
                    clearable
                  />
                  {/* Today, Tomorrow, Next week (FIN-034, decision 15). Stacked below 520px, where three
                      columns would be too narrow for "Wednesday 14 Oct". */}
                  <div role="group" aria-label="Due date shortcuts" className="grid gap-2 min-[520px]:grid-cols-3">
                    {QUICK_DUE_KINDS.map((kind) => {
                      const date = quickDueDate(kind, today);
                      return (
                        <Button
                          key={kind}
                          type="button"
                          variant="outline"
                          className="h-auto min-h-11 justify-between gap-2 px-3 py-1 text-left leading-tight min-[520px]:flex-col min-[520px]:items-start min-[520px]:justify-center min-[520px]:gap-0 sm:min-h-10"
                          aria-label={`Set due date to ${QUICK_DUE_LABELS[kind].toLowerCase()}, ${formatWeekdayDate(date)}`}
                          onClick={() => applyShortcut(kind)}
                        >
                          <span>{QUICK_DUE_LABELS[kind]}</span>
                          <span className="text-xs font-normal text-muted-foreground">{formatWeekdayDate(date)}</span>
                        </Button>
                      );
                    })}
                  </div>
                </>
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
            <FormField name="projectId" label="Project" optional errors={fieldErrors}>
              {(props) => (
                <Select
                  items={projectItems}
                  value={values.projectId || null}
                  onValueChange={(next) => set("projectId", next ?? "")}
                >
                  <SelectTrigger {...props} className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectItems.map((item) => (
                      <SelectItem key={item.value ?? ""} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </FieldGroup>
          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>
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
