import { useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { DatePicker } from "@/components/forms/date-picker";
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
import { browserToday } from "@/lib/dates";
import { createEvent, updateEvent } from "../api";
import { DATE_MAX, DATE_MIN, LIMITS, codePoints, padTime, parseNewEvent, type EventField, type EventFieldErrors } from "../domain/validation";
import { eventFieldMessage, eventsErrorMessage } from "../messages";
import type { EventItem } from "../types";

type Values = { title: string; date: string; time: string; link: string; notes: string };

function initialValues(event: EventItem | undefined): Values {
  return {
    title: event?.title ?? "",
    date: event?.date ?? browserToday(),
    time: event?.time ?? "",
    link: event?.link ?? "",
    notes: event?.notes ?? "",
  };
}

function sameValues(a: Values, b: Values) {
  return a.title === b.title && a.date === b.date && a.time === b.time && a.link === b.link && a.notes === b.notes;
}

/**
 * Add event (EVT-003) and Edit event (EVT-005). Values survive errors for a
 * retry; closing with unsaved input asks first (A5). `onSaved` runs after the
 * dialog has closed.
 */
export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventItem;
  onSaved: (item: EventItem) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => initialValues(event));
  const [initial, setInitial] = useState<Values>(values);
  const [errors, setErrors] = useState<EventFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editing = Boolean(event);

  // Each opening starts from the event (or today's date) again.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const start = initialValues(event);
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

  function error(field: EventField) {
    return eventFieldMessage(field, errors[field]);
  }

  async function onSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (pending) return;
    const time = padTime(values.time);
    if (time !== values.time) set("time", time);
    const parsed = parseNewEvent({ ...values, time });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setFormError(null);
      focusFirstInvalid(formRef.current);
      return;
    }
    setPending(true);
    setFormError(null);
    const result = editing ? await updateEvent(event!.id, parsed.value) : await createEvent(parsed.value);
    setPending(false);
    if (!result.ok) {
      setErrors(result.fields ?? {});
      setFormError(result.error === "validation" ? null : eventsErrorMessage(result.error));
      focusFirstInvalid(formRef.current);
      return;
    }
    onOpenChange(false);
    onSaved(result.data.item);
  }

  const notesLength = codePoints(values.notes.trim());

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "Add event"}</DialogTitle>
            <DialogDescription>Something that happened, or is planned.</DialogDescription>
          </DialogHeader>
          <form ref={formRef} onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
              <FormField label="Event" error={error("title")}>
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.title}
                    placeholder="Bought a TV"
                    autoComplete="off"
                    maxLength={LIMITS.title + 20}
                    onChange={(e) => set("title", e.target.value)}
                  />
                )}
              </FormField>
              <div className="grid gap-5 min-[400px]:grid-cols-[minmax(0,1fr)_8.5rem]">
                <FormField label="Date" error={error("date")}>
                  {(props) => (
                    <DatePicker
                      control={props}
                      label="Date"
                      value={values.date}
                      onChange={(date) => set("date", date)}
                      today={browserToday()}
                      min={DATE_MIN}
                      max={DATE_MAX}
                      yearDropdown
                    />
                  )}
                </FormField>
                {/* Text, not type="time": that input shows AM/PM in some browser languages (A12). */}
                <FormField label="Time" optional error={error("time")} description="24-hour, e.g. 07:45">
                  {(props) => (
                    <div className="relative">
                      <Input
                        {...props}
                        className="h-11 pr-11 font-mono"
                        value={values.time}
                        placeholder="HH:mm"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={5}
                        onChange={(e) => set("time", e.target.value)}
                        onBlur={(e) => set("time", padTime(e.target.value))}
                      />
                      {values.time ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 right-0 size-11 text-muted-foreground"
                          aria-label="Clear time"
                          onClick={() => set("time", "")}
                        >
                          <XIcon />
                        </Button>
                      ) : null}
                    </div>
                  )}
                </FormField>
              </div>
              {/* type="text": type="url" would refuse "shop.example.com/tv001", which A4 accepts. */}
              <FormField label="Link" optional error={error("link")} description="A web address. https:// is added if you leave it out.">
                {(props) => (
                  <Input
                    {...props}
                    className="h-11"
                    value={values.link}
                    placeholder="shop.example.com/tv001"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={LIMITS.link + 20}
                    onChange={(e) => set("link", e.target.value)}
                  />
                )}
              </FormField>
              <FormField
                label="Notes"
                optional
                error={error("notes")}
                labelAside={
                  <span aria-hidden="true" className={`font-mono text-xs ${notesLength > LIMITS.notes ? "text-destructive" : "text-muted-foreground"}`}>
                    {notesLength} / {LIMITS.notes}
                  </span>
                }
              >
                {(props) => (
                  <Textarea
                    {...props}
                    value={values.notes}
                    rows={4}
                    placeholder="Model number, price, who was there…"
                    onChange={(e) => set("notes", e.target.value)}
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
                {editing ? "Save changes" : "Add event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this event?</AlertDialogTitle>
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
