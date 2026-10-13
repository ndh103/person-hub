import { useNavigate } from "@tanstack/react-router";
import { Link } from "@/components/link";
import { useRef, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FormAlert } from "@/features/auth/components/form-alert";
import { finisherApi } from "../api";
import type { LocalDate } from "../domain/dates";
import { LIMITS, parseNewProject, parseProjectInput } from "../domain/validation";
import { fieldErrorMessage } from "../messages";
import { DatePicker } from "@/components/forms/date-picker";
import { focusFirstInvalid, FormField } from "./form-field";
import { EMPTY_SLOT, SlotFields, slotPayload, type SlotValues } from "./slot-fields";
import { useMutation } from "./use-mutation";
import { useFinisherRefresh } from "./use-refresh";

type ProjectValues = { title: string; goal: string; doneWhen: string; targetDate: string };

/** New project with optional first slots (FIN-023), or edit of an Active/Parked project (FIN-024). */
export function ProjectForm({
  today,
  project,
}: {
  today: LocalDate;
  project?: { id: string; title: string; goal: string | null; doneWhen: string; targetDate: LocalDate | null };
}) {
  const navigate = useNavigate();
  const refresh = useFinisherRefresh();
  const formRef = useRef<HTMLFormElement>(null);
  const editing = Boolean(project);
  const [values, setValues] = useState<ProjectValues>({
    title: project?.title ?? "",
    goal: project?.goal ?? "",
    doneWhen: project?.doneWhen ?? "",
    targetDate: project?.targetDate ?? "",
  });
  const [slots, setSlots] = useState<SlotValues[]>([]);
  const { run, pending, fieldErrors, setFieldErrors, formError } = useMutation();

  function set<K extends keyof ProjectValues>(key: K, value: ProjectValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (editing) {
      const parsed = parseProjectInput(values, today, project!.targetDate);
      if (!parsed.ok) {
        setFieldErrors(parsed.errors);
        return focusFirstInvalid(formRef.current);
      }
      const result = await run(() => finisherApi("PATCH", `/api/finisher/projects/${project!.id}`, parsed.value), {
        refresh: false,
      });
      if (!result.ok) return focusFirstInvalid(formRef.current);
      toast.add({ title: "Project saved", type: "success" });
      await refresh();
      void navigate({ to: "/finisher/projects/$id", params: { id: project!.id } });
      return;
    }

    const body = { ...values, slots: slots.map(slotPayload) };
    const parsed = parseNewProject(body, today);
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return focusFirstInvalid(formRef.current);
    }
    const result = await run(() => finisherApi<{ id: string }>("POST", "/api/finisher/projects", parsed.value), {
      refresh: false,
    });
    if (!result.ok) return focusFirstInvalid(formRef.current);
    toast.add({ title: "Project created", type: "success" });
    void refresh();
    void navigate({ to: "/finisher/projects/$id", params: { id: result.data.id } });
  }

  const slotsError = fieldErrorMessage("slots", fieldErrors.slots);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-8">
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
        <FormField name="goal" label="Goal / why it matters" optional errors={fieldErrors}>
          {(props) => <Textarea {...props} rows={3} value={values.goal} onChange={(event) => set("goal", event.target.value)} />}
        </FormField>
        <FormField
          name="doneWhen"
          label="Done when"
          errors={fieldErrors}
          description="How will you know it’s finished? For example: “She reads a short picture book on her own.”"
        >
          {(props) => (
            <Textarea {...props} rows={2} value={values.doneWhen} onChange={(event) => set("doneWhen", event.target.value)} />
          )}
        </FormField>
        <FormField name="targetDate" label="Target date" optional errors={fieldErrors}>
          {(props) => (
            <DatePicker
              control={props}
              label="Target date"
              today={today}
              min={today}
              value={values.targetDate}
              onChange={(date) => set("targetDate", date)}
              clearable
              className="h-11 w-full justify-start px-3 text-base font-normal sm:w-56 sm:text-sm"
            />
          )}
        </FormField>
      </FieldGroup>

      {!editing ? (
        <FieldSet>
          <FieldLegend>Weekly slots</FieldLegend>
          <p className="text-sm text-muted-foreground">
            Regular time for this project, for example Mon · Wed · Fri, 30 minutes at 19:00. Sessions start today. You can also
            add slots later.
          </p>
          {slotsError ? (
            <p role="alert" className="text-sm text-destructive">
              {slotsError}
            </p>
          ) : null}
          {slots.map((slot, index) => (
            <div
              key={index}
              role="group"
              aria-labelledby={`slot-${index}-title`}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 id={`slot-${index}-title`} className="text-sm font-semibold">
                  Slot {index + 1}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11"
                  onClick={() => setSlots((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Remove<span className="sr-only"> slot {index + 1}</span>
                </Button>
              </div>
              <SlotFields
                values={slot}
                prefix={`slots.${index}.`}
                errors={fieldErrors}
                onChange={(next) => setSlots((current) => current.map((item, i) => (i === index ? next : item)))}
              />
            </div>
          ))}
          {slots.length < LIMITS.slots ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 self-start"
              onClick={() => setSlots((current) => [...current, { ...EMPTY_SLOT }])}
            >
              <PlusIcon data-icon="inline-start" />
              Add a slot
            </Button>
          ) : null}
        </FieldSet>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" className="h-11" nativeButton={false} render={project ? <Link to="/finisher/projects/$id" params={{ id: project.id }} /> : <Link to="/finisher/projects" />}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
          {editing ? "Save project" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
