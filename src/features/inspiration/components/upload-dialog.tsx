import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react";
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
import { MAX_FILES, pickProblem, PICKABLE_TYPES } from "../domain/image";
import { LIMITS, parseNewItem, type ItemField, type ItemFieldErrors } from "../domain/validation";
import { fieldMessage, uploadMessage } from "../messages";
import type { InspirationListItem } from "../types";
import { prepareImage, saveImage, UploadError, type UploadProblem } from "../upload";

type Status = "ready" | "working" | "saved" | "failed" | "rejected";

type Chosen = {
  id: string;
  file: File;
  preview: string | null;
  status: Status;
  problem?: UploadProblem | "type" | "size";
};

type Values = { title: string; link: string; notes: string; tags: string };
const EMPTY: Values = { title: "", link: "", notes: "", tags: "" };

/** Any UUID: the text fields are checked here before an upload key exists. */
const PLACEHOLDER_KEY = "00000000-0000-4000-8000-000000000000";

/**
 * Add images (INS-004). Each chosen file is checked, previewed, then resized
 * and uploaded one at a time, and becomes its own entry. Files that fail stay
 * listed for a retry; saved ones are never uploaded twice. `onSaved` runs
 * once, with every saved entry, when the dialog closes.
 */
export function UploadDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (items: InspirationListItem[]) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = useId();
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<ItemFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saved, setSaved] = useState<InspirationListItem[]>([]);

  // Each opening starts empty.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChosen([]);
      setValues(EMPTY);
      setErrors({});
      setNotice(null);
      setStatus("");
      setSaved([]);
    }
  }

  // Previews are object URLs: release them when files leave the list.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const live = new Set(chosen.map((entry) => entry.preview).filter((url): url is string => url !== null));
    for (const url of previews.current) if (!live.has(url)) URL.revokeObjectURL(url);
    previews.current = live;
  }, [chosen]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const usable = chosen.filter((entry) => entry.status !== "rejected" && entry.status !== "saved");
  const single = chosen.filter((entry) => entry.status !== "rejected").length === 1;
  const anyFailed = chosen.some((entry) => entry.status === "failed");

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function patch(id: string, change: Partial<Chosen>) {
    setChosen((list) => list.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)));
  }

  function pick(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_FILES - chosen.length;
    const picked = [...files].slice(0, Math.max(0, room));
    setNotice(files.length > room ? `You can add up to ${MAX_FILES} images at a time. The first ${Math.max(0, room)} were kept.` : null);
    setChosen((list) => [
      ...list,
      ...picked.map((file): Chosen => {
        const problem = pickProblem(file);
        return {
          id: crypto.randomUUID(),
          file,
          preview: problem ? null : URL.createObjectURL(file),
          status: problem ? "rejected" : "ready",
          problem: problem ?? undefined,
        };
      }),
    ]);
  }

  function close(items: InspirationListItem[] = saved) {
    onOpenChange(false);
    if (items.length) onSaved(items);
  }

  function requestClose(next: boolean) {
    if (next) return onOpenChange(true);
    if (pending) return;
    const unsaved = usable.length > 0 || Object.values(values).some((value) => value.trim() !== "");
    if (unsaved && !saved.length) return setConfirmDiscard(true);
    close();
  }

  function error(field: ItemField) {
    return fieldMessage(field, errors[field]);
  }

  async function onSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (pending) return;
    const parsed = parseNewItem({ kind: "image", imageKey: PLACEHOLDER_KEY, ...values, title: single ? values.title : "" });
    if (!parsed || !parsed.ok) {
      setErrors(parsed && !parsed.ok ? parsed.errors : {});
      focusFirstInvalid(formRef.current);
      return;
    }
    if (!usable.length) {
      setNotice("Choose at least one image.");
      return;
    }
    setErrors({});
    setNotice(null);
    setPending(true);
    const { title, link, notes, tags } = parsed.value;
    const total = usable.length;
    const savedNow = [...saved];
    let done = 0;
    for (const entry of usable) {
      patch(entry.id, { status: "working", problem: undefined });
      try {
        const image = await prepareImage(entry.file);
        savedNow.push(await saveImage(image, { title, link, notes, tags }));
        setSaved([...savedNow]);
        done += 1;
        patch(entry.id, { status: "saved" });
        setStatus(`${done} of ${total} ${total === 1 ? "image" : "images"} saved`);
      } catch (failure) {
        const problem = failure instanceof UploadError ? failure.problem : "upload";
        // A file the browser can't decode or shrink will never succeed: reject it rather than offer a retry.
        patch(entry.id, { status: problem === "decode" || problem === "too_large" ? "rejected" : "failed", problem });
        if (problem === "unauthenticated") break;
      }
    }
    setPending(false);
    if (done === total) close(savedNow);
    else setStatus(`${done} of ${total} ${total === 1 ? "image" : "images"} saved. ${total - done} failed.`);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add images</DialogTitle>
            <DialogDescription>Images are resized before upload. Location data in photos is removed.</DialogDescription>
          </DialogHeader>
          <form ref={formRef} onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {notice ? <FormAlert tone="error">{notice}</FormAlert> : null}
              {/* A real file input, visually hidden; the label is the visible, focusable target. */}
              <div>
                <input
                  id={inputId}
                  type="file"
                  multiple
                  accept={PICKABLE_TYPES.join(",")}
                  className="peer sr-only"
                  disabled={pending || chosen.length >= MAX_FILES}
                  onChange={(e) => {
                    pick(e.target.files);
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-input bg-muted/40 p-4 text-center text-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
                >
                  <UploadIcon className="size-5" aria-hidden="true" />
                  <span className="font-medium">Choose images</span>
                  <span className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF · up to {MAX_FILES} at a time · 20 MB each</span>
                </label>
              </div>

              {chosen.length ? (
                <ul className="flex flex-col gap-2" aria-label="Chosen images">
                  {chosen.map((entry) => (
                    <li
                      key={entry.id}
                      className={`flex items-center gap-3 rounded-xl border p-2 ${entry.status === "failed" || entry.status === "rejected" ? "border-destructive/50" : "border-border"}`}
                    >
                      {entry.preview ? (
                        <img src={entry.preview} alt="" className="size-11 shrink-0 rounded-md bg-muted object-cover" />
                      ) : (
                        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-muted" aria-hidden="true">
                          <ImageIcon className="size-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{entry.file.name}</span>
                        {entry.status === "working" ? (
                          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <Spinner className="size-3.5" aria-hidden="true" /> Uploading…
                          </span>
                        ) : entry.status === "saved" ? (
                          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <CheckIcon className="size-3.5" aria-hidden="true" /> Saved
                          </span>
                        ) : entry.problem ? (
                          <span className="block text-xs text-destructive">
                            {uploadMessage(entry.problem)}
                            {entry.status === "failed" ? " Try again." : ""}
                          </span>
                        ) : (
                          <span className="block font-mono text-xs text-muted-foreground">Ready</span>
                        )}
                      </span>
                      {entry.status !== "saved" && entry.status !== "working" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 shrink-0 text-muted-foreground"
                          aria-label={`Remove ${entry.file.name}`}
                          disabled={pending}
                          onClick={() => setChosen((list) => list.filter((other) => other.id !== entry.id))}
                        >
                          <XIcon />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p role="status" aria-live="polite" className="sr-only">
                {status}
              </p>

              {single ? (
                <FormField label="Title" optional error={error("title")}>
                  {(props) => (
                    <Input
                      {...props}
                      className="h-11"
                      value={values.title}
                      autoComplete="off"
                      maxLength={LIMITS.title + 20}
                      onChange={(e) => set("title", e.target.value)}
                    />
                  )}
                </FormField>
              ) : chosen.length > 1 ? (
                <p className="text-sm text-muted-foreground">Title is available when you add one image. Source, notes and tags apply to every image.</p>
              ) : null}
              <FormField label="Source" optional error={error("link")} description="Where you found it. https:// is added if you leave it out.">
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.link}
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={LIMITS.link + 20}
                    onChange={(e) => set("link", e.target.value)}
                  />
                )}
              </FormField>
              <FormField label="Why it inspires me" optional error={error("notes")}>
                {(props) => <Textarea {...props} value={values.notes} rows={3} onChange={(e) => set("notes", e.target.value)} />}
              </FormField>
              <FormField label="Tags" optional error={error("tags")} description={`Separate with commas. Up to ${LIMITS.tags}.`}>
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.tags}
                    placeholder="travel, light"
                    autoComplete="off"
                    autoCapitalize="off"
                    onChange={(e) => set("tags", e.target.value)}
                  />
                )}
              </FormField>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => requestClose(false)}>
                {saved.length ? "Done" : "Cancel"}
              </Button>
              <Button type="submit" className="h-11" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {pending ? "Saving…" : anyFailed ? "Try again" : usable.length > 1 ? `Save ${usable.length} images` : "Save image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard these images?</AlertDialogTitle>
            <AlertDialogDescription>Nothing you chose or typed will be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Keep editing</AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => {
                setConfirmDiscard(false);
                close();
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
