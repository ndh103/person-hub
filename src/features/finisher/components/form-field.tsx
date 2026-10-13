import { FormField as SharedFormField, type ControlProps } from "@/components/forms/form-field";
import type { FieldErrors } from "../domain/validation";
import { fieldErrorMessage } from "../messages";

export { focusFirstInvalid, type ControlProps } from "@/components/forms/form-field";

/**
 * The shared labelled field (FIN-018), with the error text taken from the
 * Finisher field error codes.
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
  return (
    <SharedFormField label={label} error={fieldErrorMessage(name, errors[name])} description={description} optional={optional}>
      {children}
    </SharedFormField>
  );
}
