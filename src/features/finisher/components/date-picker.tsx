import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, type LocalDate } from "../domain/dates";
import type { ControlProps } from "./form-field";

// The calendar works on JS Dates at local midnight; the app keeps "YYYY-MM-DD".
function toDate(value: LocalDate): Date {
  return new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
}

function toLocalDate(date: Date): LocalDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A date field that shows its value as "12 Oct 2026" (decision 12), in place
 * of the native date input whose format follows the browser locale. Weeks
 * start on Monday (assumption A2). Optional fields get a "Clear date" action.
 */
export function DatePicker({
  control,
  label,
  value,
  onChange,
  today,
  min,
  max,
  clearable = false,
  className,
}: {
  control: ControlProps;
  label: string;
  value: LocalDate | "";
  onChange: (value: LocalDate | "") => void;
  today: LocalDate;
  min?: LocalDate;
  max?: LocalDate;
  clearable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? toDate(value) : undefined;
  const disabled = [
    ...(min ? [{ before: toDate(min) }] : []),
    ...(max ? [{ after: toDate(max) }] : []),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            {...control}
            type="button"
            variant="outline"
            // A <label> would replace the button's text as its name, so the value is named explicitly.
            aria-label={`${label}: ${value ? formatDate(value) : "not set"}`}
            className={className ?? "h-11 w-full justify-start px-3 text-base font-normal sm:text-sm"}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
        {value ? formatDate(value) : <span className="text-muted-foreground">Pick a date</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          className="[--cell-size:--spacing(10)]"
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? toDate(min && min > today ? min : today)}
          disabled={disabled}
          onSelect={(date) => {
            if (date) onChange(toLocalDate(date));
            setOpen(false);
          }}
        />
        {clearable && value ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
