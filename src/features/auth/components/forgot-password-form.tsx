import { useId, useState } from "react";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseEmail } from "@/lib/auth/validation";
import { requestPasswordReset } from "../api";
import { authMessages, generalErrorMessage } from "../messages";
import { FormAlert } from "./form-alert";
import { SubmitButton } from "./submit-button";

/** AUTH-005: request a password reset email. */
export function ForgotPasswordForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = parseEmail(email);
    setEmailError(address ? null : "Enter a valid email address.");
    setFormError(null);
    if (!address) return;

    setPending(true);
    const result = await requestPasswordReset(address);
    setPending(false);
    if (result.ok) setSent(true);
    else setFormError(generalErrorMessage(result.error));
  }

  if (sent) return <FormAlert tone="info">{authMessages.resetSent}</FormAlert>;

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Request a password reset">
      <FieldGroup>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-11"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? `${id}-email-error` : undefined}
          />
          {emailError ? <FieldError id={`${id}-email-error`}>{emailError}</FieldError> : null}
        </Field>
        <SubmitButton pending={pending} pendingLabel="Sending…">
          Send reset link
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
