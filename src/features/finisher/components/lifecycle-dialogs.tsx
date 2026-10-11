"use client";

import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FormAlert } from "@/features/auth/components/form-alert";
import { finisherApi } from "../api";
import { addDays, type LocalDate } from "../domain/dates";
import { LIMITS, parseProjectAction } from "../domain/validation";
import { focusFirstInvalid, FormField } from "./form-field";
import { useMutation } from "./use-mutation";

export type ItemKind = "task" | "project";

function actionPath(kind: ItemKind, id: string) {
  return `/api/finisher/${kind === "task" ? "tasks" : "projects"}/${id}/actions`;
}

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ItemKind;
  id: string;
  title: string;
};

function PendingButton({ pending, children, variant }: { pending: boolean; children: React.ReactNode; variant?: "default" | "destructive" }) {
  return (
    <Button type="submit" variant={variant} className="h-11" disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}

/** FIN-013: park with a revisit date, or change the date of a parked item. */
export function ParkDialog({ open, onOpenChange, kind, id, title, today, current }: DialogProps & { today: LocalDate; current?: LocalDate | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState(current ?? addDays(today, 7));
  const { run, pending, fieldErrors, setFieldErrors, formError, reset } = useMutation();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseProjectAction({ action: "park", revisitDate: date }, today);
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      focusFirstInvalid(formRef.current);
      return;
    }
    const result = await run(() => finisherApi("POST", actionPath(kind, id), { action: "park", revisitDate: date }));
    if (!result.ok) return focusFirstInvalid(formRef.current);
    toast.add({ title: current ? "Revisit date changed" : `Parked “${title}”`, type: "success" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (reset(), onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{current ? "Change revisit date" : `Park this ${kind}`}</DialogTitle>
          <DialogDescription>
            {kind === "project"
              ? "No sessions are scheduled while a project is parked. Nothing changes automatically on the revisit date."
              : "A parked task leaves Today until you unpark it. Nothing changes automatically on the revisit date."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
            <FormField name="revisitDate" label="Revisit on" errors={fieldErrors} description="From tomorrow up to a year ahead.">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  className="h-11"
                  min={addDays(today, 1)}
                  max={addDays(today, LIMITS.parkMaxDays)}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              )}
            </FormField>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <PendingButton pending={pending}>{current ? "Change date" : "Park"}</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** FIN-012: let go is a deliberate, valid decision, with a reason. */
export function LetGoDialog({ open, onOpenChange, kind, id, title }: DialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [reason, setReason] = useState("");
  const { run, pending, fieldErrors, setFieldErrors, formError, reset } = useMutation();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setFieldErrors({ reason: "required" });
      focusFirstInvalid(formRef.current);
      return;
    }
    const result = await run(() => finisherApi("POST", actionPath(kind, id), { action: "let_go", reason }));
    if (!result.ok) return focusFirstInvalid(formRef.current);
    toast.add({ title: `You let go of “${title}”`, description: "That’s a decision, not a failure.", type: "success" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (reset(), onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Let go of “{title}”?</DialogTitle>
          <DialogDescription>
            You decided this no longer deserves your energy. It moves to Closed, shown apart from finished work, and you can
            reopen it later.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
            <FormField name="reason" label="Why are you letting it go?" errors={fieldErrors}>
              {(props) => <Textarea {...props} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />}
            </FormField>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Keep it
            </Button>
            <PendingButton pending={pending}>Let go</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** FIN-029: finish a project, with its Done when and an optional reflection. */
export function FinishDialog({
  open,
  onOpenChange,
  id,
  title,
  doneWhen,
  openTasks,
}: Omit<DialogProps, "kind"> & { doneWhen: string; openTasks: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [reflection, setReflection] = useState("");
  const { run, pending, fieldErrors, formError, reset } = useMutation();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await run(() => finisherApi("POST", actionPath("project", id), { action: "finish", reflection }));
    if (!result.ok) return focusFirstInvalid(formRef.current);
    toast.add({ title: "Project finished. Well done!", description: `“${title}” is in Closed.`, type: "success" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (reset(), onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finish “{title}”?</DialogTitle>
          <DialogDescription>Done when: {doneWhen}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
            {openTasks > 0 ? (
              <FormAlert tone="info">
                {openTasks} open {openTasks === 1 ? "task stays" : "tasks stay"} open and linked to this project.
              </FormAlert>
            ) : null}
            <FormField name="reflection" label="Reflection" optional errors={fieldErrors}>
              {(props) => (
                <Textarea {...props} rows={3} value={reflection} onChange={(event) => setReflection(event.target.value)} />
              )}
            </FormField>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Not yet
            </Button>
            <PendingButton pending={pending}>Finish project</PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** FIN-016: permanent delete after naming the item. */
export function DeleteDialog({
  open,
  onOpenChange,
  kind,
  id,
  title,
  onDeleted,
}: DialogProps & { onDeleted?: () => void }) {
  const { run, pending, formError, reset } = useMutation();

  async function onConfirm() {
    const result = await run(
      () => finisherApi("DELETE", `/api/finisher/${kind === "task" ? "tasks" : "projects"}/${id}`),
      { refresh: !onDeleted },
    );
    if (!result.ok) return;
    toast.add({ title: `Deleted “${title}”`, type: "success" });
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (reset(), onOpenChange(next))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "project"
              ? "This permanently deletes the project, its slots and its session history. Its tasks are kept without the project link. This can’t be undone."
              : "This permanently deletes the task. This can’t be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          <Button variant="destructive" className="h-11" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Delete permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** FIN-030: reopen a closed project after confirmation. */
export function ReopenProjectDialog({ open, onOpenChange, id, title }: Omit<DialogProps, "kind">) {
  const { run, pending, formError, reset } = useMutation();

  async function onConfirm() {
    const result = await run(() => finisherApi("POST", actionPath("project", id), { action: "reopen" }));
    if (!result.ok) return;
    toast.add({ title: `Reopened “${title}”`, type: "success" });
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (reset(), onOpenChange(next))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reopen “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            It becomes Active again and sessions are scheduled from today. Its reflection or reason is cleared; past sessions
            and rates are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          <Button className="h-11" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Reopen project
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
