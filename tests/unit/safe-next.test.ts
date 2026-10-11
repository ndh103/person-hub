import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNext } from "@/lib/auth/safe-next";

const SITE = "http://localhost:3000";

describe("safeNext (open-redirect guard, architecture T6)", () => {
  it.each([
    ["/finisher", "/finisher"],
    ["/finisher?tab=tasks#today", "/finisher?tab=tasks#today"],
    ["/account/set-password", "/account/set-password"],
    ["/a/../home", "/home"],
  ])("keeps the same-site path %s", (input, expected) => {
    expect(safeNext(input, SITE)).toBe(expected);
  });

  it.each([
    "https://evil.test/home",
    "//evil.test",
    "/\\evil.test",
    "/\tevil",
    "\\\\evil.test",
    "javascript:alert(1)",
    "data:text/html,hi",
    "home",
    "",
    "/api/auth/sign-out",
    "/api",
  ])("rejects %j", (input) => {
    expect(safeNext(input, SITE)).toBe(DEFAULT_NEXT);
  });

  it("rejects non-strings and very long values", () => {
    expect(safeNext(undefined, SITE)).toBe(DEFAULT_NEXT);
    expect(safeNext(["/home"], SITE)).toBe(DEFAULT_NEXT);
    expect(safeNext(`/${"a".repeat(3000)}`, SITE)).toBe(DEFAULT_NEXT);
  });

  it("reduces a same-origin absolute URL (from email templates) to its path", () => {
    expect(safeNext("http://localhost:3000/finisher?x=1", SITE)).toBe("/finisher?x=1");
  });

  it("rejects absolute URLs on other origins, including look-alike hosts and ports", () => {
    expect(safeNext("http://localhost:3001/finisher", SITE)).toBe(DEFAULT_NEXT);
    expect(safeNext("http://localhost:3000.evil.test/", SITE)).toBe(DEFAULT_NEXT);
    expect(safeNext("https://localhost:3000/", SITE)).toBe(DEFAULT_NEXT);
  });

  it("rejects absolute URLs when no site origin is known", () => {
    expect(safeNext("http://localhost:3000/finisher")).toBe(DEFAULT_NEXT);
  });
});
