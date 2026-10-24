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
import { deleteItem } from "../api";
import type { InspirationItem } from "../types";

/**
 * INS-007: permanent delete after a confirmation that names the entry. For
 * images the file is deleted too. On failure the dialog stays open.
 */
export function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: InspirationItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onConfirm() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const result = await deleteItem(item.id);
    setPending(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  const image = item.kind === "image";
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setFailed(false);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="[overflow-wrap:anywhere]">{item.title ? `Delete “${item.title}”?` : "Delete this image?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {image ? "This permanently deletes the entry and its image file." : "This permanently deletes the article."} It can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed ? <FormAlert tone="error">Couldn’t delete the entry. It is still saved. Try again.</FormAlert> : null}
        <AlertDialogFooter>
          {/* Cancel first, so it gets the initial focus: the safe default for a permanent action. */}
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          <Button variant="destructive" className="h-11" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
            Delete entry
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
