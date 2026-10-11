"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OTP_CODE_LENGTH, parseEmail, parseOtpCode, parseSignInPassword } from "@/lib/auth/validation";
import { navigateTo, postAuth } from "../api";
import { authMessages, generalErrorMessage, signInNotice } from "../messages";
import { FormAlert } from "./form-alert";
import { SubmitButton } from "./submit-button";

const RESEND_COOLDOWN_SECONDS = 60;

/** AUTH-001, 002, 003, 010: the three sign-in methods. Password is the default. */
export function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? undefined;
  const notice = signInNotice(params);

  return (
    <div className="flex flex-col gap-5">
      {notice ? <FormAlert tone={notice.tone}>{notice.text}</FormAlert> : null}
      <Tabs defaultValue="password">
        <TabsList className="w-full group-data-horizontal/tabs:h-11">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="email">Email link</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
        </TabsList>
        <TabsContent value="password" className="pt-4">
          <PasswordSignIn next={next} />
        </TabsContent>
        <TabsContent value="email" className="pt-4">
          <EmailSignIn next={next} />
        </TabsContent>
        <TabsContent value="google" className="pt-4">
          <GoogleSignIn next={next} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PasswordSignIn({ next }: { next?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = {
      email: parseEmail(email) ? undefined : "Enter a valid email address.",
      password: parseSignInPassword(password) ? undefined : "Enter your password.",
    };
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password) return;

    setPending(true);
    const result = await postAuth<{ redirectTo: string }>("/api/auth/password", { email, password, next });
    if (result.ok) {
      navigateTo(result.data.redirectTo);
      return;
    }
    setPending(false);
    setPassword("");
    setFormError(generalErrorMessage(result.error));
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Sign in with password">
      <FieldGroup>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        <Field data-invalid={fieldErrors.email ? true : undefined}>
          <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-11"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? `${id}-email-error` : undefined}
          />
          {fieldErrors.email ? <FieldError id={`${id}-email-error`}>{fieldErrors.email}</FieldError> : null}
        </Field>
        <Field data-invalid={fieldErrors.password ? true : undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="rounded-sm text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id={`${id}-password`}
            type="password"
            autoComplete="current-password"
            className="h-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? `${id}-password-error` : undefined}
          />
          {fieldErrors.password ? <FieldError id={`${id}-password-error`}>{fieldErrors.password}</FieldError> : null}
        </Field>
        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

function EmailSignIn({ next }: { next?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendEmail(address: string) {
    setFormError(null);
    setPending(true);
    const result = await postAuth<{ sent: boolean }>("/api/auth/otp", { email: address, next });
    setPending(false);
    if (!result.ok) {
      setFormError(generalErrorMessage(result.error));
      return;
    }
    setSentTo(address);
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    requestAnimationFrame(() => codeRef.current?.focus());
  }

  async function onRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = parseEmail(email);
    setEmailError(address ? null : "Enter a valid email address.");
    if (address) await sendEmail(address);
  }

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo) return;
    if (!parseOtpCode(code)) {
      setFormError(`Enter the ${OTP_CODE_LENGTH}-digit code from the email.`);
      return;
    }
    setFormError(null);
    setPending(true);
    const result = await postAuth<{ redirectTo: string }>("/api/auth/otp/verify", { email: sentTo, code, next });
    if (result.ok) {
      navigateTo(result.data.redirectTo);
      return;
    }
    setPending(false);
    setCode("");
    setFormError(generalErrorMessage(result.error));
  }

  if (!sentTo) {
    return (
      <form onSubmit={onRequest} noValidate aria-label="Sign in with an email link or code">
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
              aria-describedby={emailError ? `${id}-email-error` : `${id}-email-help`}
            />
            {emailError ? (
              <FieldError id={`${id}-email-error`}>{emailError}</FieldError>
            ) : (
              <FieldDescription id={`${id}-email-help`}>
                We’ll email you a sign-in link and a {OTP_CODE_LENGTH}-digit code.
              </FieldDescription>
            )}
          </Field>
          <SubmitButton pending={pending} pendingLabel="Sending…">
            Email me a link and code
          </SubmitButton>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} noValidate aria-label="Enter your sign-in code">
      <FieldGroup>
        <FormAlert tone="info">{authMessages.emailSent}</FormAlert>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        <Field>
          <FieldLabel htmlFor={`${id}-code`}>Sign-in code</FieldLabel>
          <InputOTP
            id={`${id}-code`}
            ref={codeRef}
            maxLength={OTP_CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={setCode}
            aria-describedby={`${id}-code-help`}
          >
            <InputOTPGroup>
              {Array.from({ length: OTP_CODE_LENGTH }, (_, index) => (
                <InputOTPSlot key={index} index={index} className="size-11 text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <FieldDescription id={`${id}-code-help`}>
            Sent to {sentTo}. Or open the link in the email on this device.
          </FieldDescription>
        </Field>
        <SubmitButton pending={pending} pendingLabel="Checking…">
          Sign in with code
        </SubmitButton>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={() => {
              setSentTo(null);
              setFormError(null);
            }}
          >
            Use a different email
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={pending || cooldown > 0}
            onClick={() => sendEmail(sentTo)}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function GoogleSignIn({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onContinue() {
    setFormError(null);
    setPending(true);
    const result = await postAuth<{ url: string }>("/api/auth/google", { next });
    if (result.ok) {
      navigateTo(result.data.url);
      return;
    }
    setPending(false);
    setFormError(generalErrorMessage(result.error));
  }

  return (
    <div className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      <p className="text-sm text-muted-foreground">
        Use the Google account with the same email as your hub invitation.
      </p>
      <SubmitButton type="button" variant="outline" pending={pending} pendingLabel="Opening Google…" onClick={onContinue}>
        Continue with Google
      </SubmitButton>
    </div>
  );
}
