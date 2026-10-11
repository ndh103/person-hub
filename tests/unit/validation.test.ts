import { describe, expect, it } from "vitest";
import {
  parseConfirmType,
  parseEmail,
  parseNewPassword,
  parseOtpCode,
  parseSignInPassword,
} from "@/lib/auth/validation";

describe("auth input validation", () => {
  it("accepts and trims a normal email, rejects malformed or oversized ones", () => {
    expect(parseEmail("  me@example.com ")).toBe("me@example.com");
    expect(parseEmail("not-an-email")).toBeNull();
    expect(parseEmail("a b@example.com")).toBeNull();
    expect(parseEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
    expect(parseEmail(42)).toBeNull();
  });

  it("requires a non-empty sign-in password within the size bound", () => {
    expect(parseSignInPassword("x")).toBe("x");
    expect(parseSignInPassword("")).toBeNull();
    expect(parseSignInPassword("a".repeat(257))).toBeNull();
  });

  it("requires new passwords of at least 8 characters (AUTH-004)", () => {
    expect(parseNewPassword("1234567")).toBeNull();
    expect(parseNewPassword("12345678")).toBe("12345678");
    expect(parseNewPassword("a".repeat(257))).toBeNull();
  });

  it("accepts only 6-digit codes", () => {
    expect(parseOtpCode("123456")).toBe("123456");
    expect(parseOtpCode(" 123456 ")).toBe("123456");
    expect(parseOtpCode("12345")).toBeNull();
    expect(parseOtpCode("12345a")).toBeNull();
    expect(parseOtpCode(123456)).toBeNull();
  });

  it("allows only the email-link types the hub uses", () => {
    expect(parseConfirmType("email")).toBe("email");
    expect(parseConfirmType("invite")).toBe("invite");
    expect(parseConfirmType("recovery")).toBe("recovery");
    expect(parseConfirmType("email_change")).toBeNull();
    expect(parseConfirmType("signup")).toBeNull();
    expect(parseConfirmType(null)).toBeNull();
  });
});
