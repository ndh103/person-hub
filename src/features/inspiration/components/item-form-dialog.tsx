import { useRef, useState } from "react";
import { focusFirstInvalid, FormField } from "@/components/forms/form-field";
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
import { FormAlert } from "@/features/auth/components/form-alert";
import { codePoints } from "@/lib/text";
import { createArticle, updateItem } from "../api";
import { LIMITS, parseItemChange, parseNewItem, type ItemField, type ItemFieldErrors, type ItemKind } from "../domain/validation";
import { fieldMessage, inspirationErrorMessage } from "../messages";
import type { InspirationItem, InspirationListItem } from "../types";

type Values = { title: string; link: string; body: string; notes: string; tags: string };

function initialValues(item: InspirationItem | undefined): Values {
  return {
    title: item?.title ?? "",
    link: item?.link ?? "",
    body: item?.body ?? "",
    notes: item?.notes ?? "",
    tags: item?.tags.join(", ") ?? "",
  };
}

function sameValues(a: Values, b: Values) {
  return a.title === b.title && a.link === b.link && a.body === b.body && a.notes === b.notes && a.tags === b.tags;
}

/**
 * Add article (INS-003), Edit article and Edit image text (INS-006). Values
 * survive errors for a retry; closing with unsaved input asks first.
 * `onSaved` runs after the dialog has closed.
 */
export function ItemFormDialog({
  open,
  onOpenChange,
  kind,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ItemKind;
  item?: InspirationItem;
  onSaved: (item: InspirationListItem) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => initialValues(item));
  const [initial, setInitial] = useState<Values>(values);
  const [errors, setErrors] = useState<ItemFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editing = Boolean(item);
  const article = kind === "article";

  // Each opening starts from the entry (or empty) again.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const start = initialValues(item);
      setValues(start);
      setInitial(start);
      setErrors({});
      setFormError(null);
    }
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function requestClose(next: boolean) {
    if (next) return onOpenChange(true);
    if (pending) return;
    if (!sameValues(values, initial)) return setConfirmDiscard(true);
    onOpenChange(false);
  }

  function error(field: ItemField) {
    return fieldMessage(field, errors[field]);
  }

  async function onSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (pending) return;
    const fields = article ? values : { title: values.title, link: values.link, notes: values.notes, tags: values.tags };
    // Edits send the parsed change; a new article sends every field.
    const change = editing ? parseItemChange(fields, kind) : null;
    const created = editing ? null : parseNewItem({ kind: "article", ...fields });
    const parsed = change ?? created;
    if (!parsed || !parsed.ok) {
      setErrors(parsed && "errors" in parsed ? parsed.errors : {});
      setFormError(null);
      focusFirstInvalid(formRef.current);
      return;
    }
    setPending(true);
    setFormError(null);
    const result =
      change?.ok
        ? await updateItem(item!.id, change.value)
        : created?.ok
          ? await createArticle({ ...created.value, title: created.value.title! })
          : null;
    if (!result) return;
    setPending(false);
    if (!result.ok) {
      setErrors(result.fields ?? {});
      setFormError(result.error === "validation" ? null : inspirationErrorMessage(result.error));
      focusFirstInvalid(formRef.current);
      return;
    }
    onOpenChange(false);
    onSaved(result.data.item);
  }

  const bodyLength = codePoints(values.body.trim());
  const notesLength = codePoints(values.notes.trim());

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? (article ? "Edit article" : "Edit image") : "Add article"}</DialogTitle>
            <DialogDescription>{article ? "Save the link and paste the text you want to keep." : "The image itself can’t be changed."}</DialogDescription>
          </DialogHeader>
          <form ref={formRef} onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
              <FormField label="Title" optional={!article} error={error("title")}>
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.title}
                    placeholder={article ? "Designing calm interfaces" : "Morning light in Hội An"}
                    autoComplete="off"
                    maxLength={LIMITS.title + 20}
                    onChange={(e) => set("title", e.target.value)}
                  />
                )}
              </FormField>
              {/* type="text": type="url" would refuse "example.com/calm", which is accepted. */}
              <FormField
                label={article ? "Link" : "Source"}
                optional
                error={error("link")}
                description="A web address. https:// is added if you leave it out."
              >
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.link}
                    placeholder="example.com/calm"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={LIMITS.link + 20}
                    onChange={(e) => set("link", e.target.value)}
                  />
                )}
              </FormField>
              {article ? (
                <FormField
                  label="Article text"
                  optional
                  error={error("body")}
                  labelAside={
                    <span aria-hidden="true" className={`font-mono text-xs ${bodyLength > LIMITS.body ? "text-destructive" : "text-muted-foreground"}`}>
                      {bodyLength.toLocaleString("en")} / {LIMITS.body.toLocaleString("en")}
                    </span>
                  }
                >
                  {(props) => (
                    <Textarea
                      {...props}
                      value={values.body}
                      rows={8}
                      className="max-h-[50dvh]"
                      placeholder="Paste the article or the parts you want to keep"
                      onChange={(e) => set("body", e.target.value)}
                    />
                  )}
                </FormField>
              ) : null}
              <FormField
                label="Why it inspires me"
                optional
                error={error("notes")}
                labelAside={
                  <span aria-hidden="true" className={`font-mono text-xs ${notesLength > LIMITS.notes ? "text-destructive" : "text-muted-foreground"}`}>
                    {notesLength} / {LIMITS.notes}
                  </span>
                }
              >
                {(props) => <Textarea {...props} value={values.notes} rows={3} onChange={(e) => set("notes", e.target.value)} />}
              </FormField>
              <FormField label="Tags" optional error={error("tags")} description={`Separate with commas. Up to ${LIMITS.tags}.`}>
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.tags}
                    placeholder="design, ui"
                    autoComplete="off"
                    autoCapitalize="off"
                    onChange={(e) => set("tags", e.target.value)}
                  />
                )}
              </FormField>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="h-11" onClick={() => requestClose(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-11" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {editing ? "Save changes" : "Save article"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>What you typed will not be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Keep editing</AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => {
                setConfirmDiscard(false);
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
