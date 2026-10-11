import { useId } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import type { FieldErrors } from "../domain/validation";
import { fieldErrorMessage } from "../messages";

export type ControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

/**
 * A labelled form control with its error linked through aria-describedby
 * (FIN-018). The error text comes from the shared field error codes.
 */
export function FormField({
  name,
  label,
  errors,
  description,
  optional,
  children,
}: {
  name: string;
  label: string;
  errors: FieldErrors;
  description?: React.ReactNode;
  optional?: boolean;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = useId();
  const error = fieldErrorMessage(name, errors[name]);
  const describedBy = [error ? `${id}-error` : null, description ? `${id}-help` : null].filter(Boolean).join(" ");
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </FieldLabel>
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
