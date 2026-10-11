import { useId } from "react";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { weekdayLong, weekdayShort } from "../domain/dates";
import { LIMITS, type FieldErrors } from "../domain/validation";
import { fieldErrorMessage } from "../messages";
import { FormField } from "./form-field";

export type SlotValues = { activity: string; days: number[]; durationMinutes: string; startTime: string };

export const EMPTY_SLOT: SlotValues = { activity: "", days: [], durationMinutes: "30", startTime: "" };

export function slotPayload(values: SlotValues) {
  const minutes = values.durationMinutes.trim();
  return {
    activity: values.activity,
    days: values.days,
    durationMinutes: minutes === "" ? null : Number(minutes),
    startTime: values.startTime || null,
  };
}

/** Activity, days, duration and start time of one weekly slot. `prefix` scopes error keys ("slots.0."). */
export function SlotFields({
  values,
  onChange,
  errors,
  prefix = "",
}: {
  values: SlotValues;
  onChange: (values: SlotValues) => void;
  errors: FieldErrors;
  prefix?: string;
}) {
  const daysId = useId();
  const daysError = fieldErrorMessage(`${prefix}days`, errors[`${prefix}days`]);
  const scoped: FieldErrors = Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );

  return (
    <>
      <FormField name="activity" label="Activity" errors={scoped}>
        {(props) => (
          <Input
            {...props}
            className="h-11"
            value={values.activity}
            maxLength={LIMITS.activity + 20}
            onChange={(event) => onChange({ ...values, activity: event.target.value })}
          />
        )}
      </FormField>
      <FieldSet data-invalid={daysError ? true : undefined}>
        <FieldLegend variant="label">Days</FieldLegend>
        <ToggleGroup
          multiple
          variant="outline"
          spacing={1}
          aria-describedby={daysError ? `${daysId}-error` : undefined}
          className="grid w-full grid-cols-7"
          value={values.days.map(String)}
          onValueChange={(next) =>
            onChange({ ...values, days: (next as string[]).map(Number).sort((a, b) => a - b) })
          }
        >
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <ToggleGroupItem
              key={day}
              value={String(day)}
              aria-label={weekdayLong(day)}
              className="min-h-11 w-full px-0 data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary-hover data-pressed:hover:text-primary-foreground"
            >
              {weekdayShort(day).slice(0, 2)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {daysError ? <FieldError id={`${daysId}-error`}>{daysError}</FieldError> : null}
      </FieldSet>
      <div className="grid grid-cols-2 gap-4">
        <FormField name="durationMinutes" label="Minutes" errors={scoped}>
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="numeric"
              min={LIMITS.minDuration}
              max={LIMITS.maxDuration}
              step={5}
              className="h-11"
              value={values.durationMinutes}
              onChange={(event) => onChange({ ...values, durationMinutes: event.target.value })}
            />
          )}
        </FormField>
        <FormField name="startTime" label="Start time" optional errors={scoped}>
          {(props) => (
            <Input
              {...props}
              type="time"
              className="h-11"
              value={values.startTime}
              onChange={(event) => onChange({ ...values, startTime: event.target.value })}
            />
          )}
        </FormField>
      </div>
    </>
  );
}
