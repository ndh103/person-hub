import { useId } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export type ControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

/**
 * A labelled form control with its help text and error linked through
 * aria-describedby, so errors are announced with the field. Features turn
 * their own error codes into the message.
 */
export function FormField({
  label,
  error,
  description,
  optional,
  labelAside,
  children,
}: {
  label: string;
  error?: string | null;
  description?: React.ReactNode;
  optional?: boolean;
  /** Shown at the end of the label row, for example a character count. */
  labelAside?: React.ReactNode;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, description ? `${id}-help` : null].filter(Boolean).join(" ");
  const fieldLabel = (
    <FieldLabel htmlFor={id}>
      {label}
      {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
    </FieldLabel>
  );
  return (
    <Field data-invalid={error ? true : undefined}>
      {labelAside ? (
        <div className="flex items-baseline justify-between gap-2">
          {fieldLabel}
          {labelAside}
        </div>
      ) : (
        fieldLabel
      )}
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy || undefined })}
      {description ? <FieldDescription id={`${id}-help`}>{description}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

/** Moves focus to the first invalid control after a failed submit. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  });
}
