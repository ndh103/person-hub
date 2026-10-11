export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 256;
/** Minimum for new passwords (requirements AUTH-004, assumption A2). */
export const NEW_PASSWORD_MIN_LENGTH = 8;
export const OTP_CODE_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) return null;
  return EMAIL_PATTERN.test(email) ? email : null;
}

/** Password typed at sign-in: any non-empty value within the size bound. */
export function parseSignInPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > PASSWORD_MAX_LENGTH) return null;
  return value;
}

export function parseNewPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < NEW_PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) return null;
  return value;
}

export function parseOtpCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(code) ? code : null;
}

/** Email-link types accepted by /auth/confirm (architecture: FLOW-2, 4, 5). */
export const CONFIRM_TYPES = ["email", "recovery", "invite"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

export function parseConfirmType(value: unknown): ConfirmType | null {
  return CONFIRM_TYPES.find((type) => type === value) ?? null;
}
