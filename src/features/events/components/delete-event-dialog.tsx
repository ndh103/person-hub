import { useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { FormAlert } from "@/features/auth/components/form-alert";
import { deleteEvent } from "../api";
import type { EventItem } from "../types";

/**
 * EVT-006: permanent delete after a confirmation that names the event. On
 * failure the dialog stays open with an error and the event stays listed.
 */
export function DeleteEventDialog({
  event,
  onOpenChange,
  onDeleted,
}: {
  event: EventItem | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (event: EventItem) => void;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // Keep the title while the dialog animates closed after event becomes null.
  const [shown, setShown] = useState(event);
  if (event && event !== shown) setShown(event);

  async function onConfirm() {
    if (!event || pending) return;
    setPending(true);
    setFailed(false);
    const result = await deleteEvent(event.id);
    setPending(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    onOpenChange(false);
    onDeleted(event);
  }

  return (
    <AlertDialog
      open={event !== null}
      onOpenChange={(next) => {
        if (pending) return;
        setFailed(false);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="[overflow-wrap:anywhere]">Delete “{shown?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>This permanently deletes the event. It can’t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {failed ? <FormAlert tone="error">Couldn’t delete the event. It is still in your list. Try again.</FormAlert> : null}
        <AlertDialogFooter>
          {/* Cancel is the first control, so it gets the initial focus: the safe default for a permanent action. */}
          <AlertDialogCancel className="h-11">
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" className="h-11" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Delete event
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
