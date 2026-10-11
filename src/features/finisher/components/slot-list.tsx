import { useRef, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { FormAlert } from "@/features/auth/components/form-alert";
import { finisherApi } from "../api";
import { formatDays, formatDuration } from "../domain/dates";
import { LIMITS, parseSlotInput } from "../domain/validation";
import type { SlotItem } from "../types";
import { focusFirstInvalid } from "./form-field";
import { RowList } from "./list-parts";
import { EMPTY_SLOT, SlotFields, slotPayload, type SlotValues } from "./slot-fields";
import { useMutation } from "./use-mutation";

/** "Mon · Wed · Fri — Watch ABK program — 30 min — 19:00" (FIN-025). */
export function slotSummary(slot: Omit<SlotItem, "id">): string {
  return [formatDays(slot.days), slot.activity, formatDuration(slot.durationMinutes), slot.startTime]
    .filter(Boolean)
    .join(" — ");
}

function SlotDialog({
  open,
  onOpenChange,
  projectId,
  slot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  slot?: SlotItem;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const initial = (): SlotValues =>
    slot
      ? { activity: slot.activity, days: slot.days, durationMinutes: String(slot.durationMinutes), startTime: slot.startTime ?? "" }
      : { ...EMPTY_SLOT };
  const [values, setValues] = useState<SlotValues>(initial);
  const { run, pending, fieldErrors, setFieldErrors, formError, reset } = useMutation();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const payload = slotPayload(values);
    const parsed = parseSlotInput(payload);
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return focusFirstInvalid(formRef.current);
    }
    const result = slot
      ? await run(() => finisherApi("PATCH", `/api/finisher/slots/${slot.id}`, parsed.value))
      : await run(() => finisherApi("POST", `/api/finisher/projects/${projectId}/slots`, parsed.value));
    if (!result.ok) return focusFirstInvalid(formRef.current);
    toast.add({ title: slot ? "Slot updated from today" : "Slot added", type: "success" });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        reset();
        if (next) setValues(initial());
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{slot ? "Edit slot" : "Add a slot"}</DialogTitle>
          <DialogDescription>
            {slot
              ? "Changes apply from today. Earlier sessions and past weekly rates stay as they were."
              : "Sessions are scheduled from today on the days you choose."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
            <SlotFields values={values} onChange={setValues} errors={fieldErrors} />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {slot ? "Save slot" : "Add slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveSlotDialog({ open, onOpenChange, slot }: { open: boolean; onOpenChange: (open: boolean) => void; slot: SlotItem }) {
  const { run, pending, formError, reset } = useMutation();
  async function onConfirm() {
    const result = await run(() => finisherApi("DELETE", `/api/finisher/slots/${slot.id}`));
    if (!result.ok) return;
    toast.add({ title: `Removed “${slot.activity}”`, type: "success" });
    onOpenChange(false);
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        reset();
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove “{slot.activity}”?</AlertDialogTitle>
          <AlertDialogDescription>
            No more sessions are scheduled for this slot from today. Its past sessions are kept and still count in past weekly
            rates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          <Button variant="destructive" className="h-11" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Remove slot
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** FIN-025: the project's current slots, editable while the project is Active or Parked. */
export function SlotList({ projectId, slots, editable }: { projectId: string; slots: SlotItem[]; editable: boolean }) {
  const [editing, setEditing] = useState<SlotItem | null>(null);
  const [removing, setRemoving] = useState<SlotItem | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {slots.length ? (
        <RowList label="Weekly slots">
          {slots.map((slot) => (
            <li key={slot.id} className="flex items-center gap-2 p-3 sm:p-4">
              <p className="min-w-0 flex-1 text-sm break-words">{slotSummary(slot)}</p>
              {editable ? (
                <>
                  <Button variant="ghost" size="icon-lg" className="size-11" aria-label={`Edit slot “${slot.activity}”`} onClick={() => setEditing(slot)}>
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label={`Remove slot “${slot.activity}”`}
                    onClick={() => setRemoving(slot)}
                  >
                    <Trash2Icon />
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </RowList>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          No weekly slots{editable ? ". Add one to schedule regular sessions." : "."}
        </p>
      )}
      {editable && slots.length < LIMITS.slots ? (
        <Button variant="outline" className="h-11 self-start" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          Add a slot
        </Button>
      ) : null}
      <SlotDialog open={adding} onOpenChange={setAdding} projectId={projectId} />
      {editing ? (
        <SlotDialog
          key={editing.id}
          open
          onOpenChange={(next) => !next && setEditing(null)}
          projectId={projectId}
          slot={editing}
        />
      ) : null}
      {removing ? (
        <RemoveSlotDialog key={removing.id} open onOpenChange={(next) => !next && setRemoving(null)} slot={removing} />
      ) : null}
    </div>
  );
}
