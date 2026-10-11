import { useId, useState } from "react";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NEW_PASSWORD_MIN_LENGTH, parseNewPassword } from "@/lib/auth/validation";
import { navigateTo, updatePassword } from "../api";
import { authMessages, generalErrorMessage } from "../messages";
import { FormAlert } from "./form-alert";
import { SubmitButton } from "./submit-button";

/** AUTH-004, AUTH-005: choose a new password after an invitation or reset link. */
export function SetPasswordForm({ email }: { email: string | null }) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      password: parseNewPassword(password) ? undefined : authMessages.weakPassword,
      confirm: confirm === password ? undefined : "The passwords don’t match.",
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.password || nextErrors.confirm) return;

    setPending(true);
    const result = await updatePassword(password);
    if (result.ok) {
      navigateTo(result.data.redirectTo);
      return;
    }
    setPending(false);
    setFormError(generalErrorMessage(result.error));
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Set your password">
      <FieldGroup>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {/* Lets password managers save the new password against the right account. */}
        {email ? <input type="email" name="username" autoComplete="username" value={email} readOnly hidden /> : null}
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor={`${id}-password`}>New password</FieldLabel>
          <Input
            id={`${id}-password`}
            type="password"
            autoComplete="new-password"
            className="h-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={`${id}-password-help`}
          />
          {errors.password ? (
            <FieldError id={`${id}-password-help`}>{errors.password}</FieldError>
          ) : (
            <FieldDescription id={`${id}-password-help`}>At least {NEW_PASSWORD_MIN_LENGTH} characters.</FieldDescription>
          )}
        </Field>
        <Field data-invalid={errors.confirm ? true : undefined}>
          <FieldLabel htmlFor={`${id}-confirm`}>Confirm new password</FieldLabel>
          <Input
            id={`${id}-confirm`}
            type="password"
            autoComplete="new-password"
            className="h-11"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? `${id}-confirm-error` : undefined}
          />
          {errors.confirm ? <FieldError id={`${id}-confirm-error`}>{errors.confirm}</FieldError> : null}
        </Field>
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save password
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
