import { describe, expect, it } from "vitest";
import { fitWithin, formatBytes, imagePaths, pickProblem } from "@/features/inspiration/domain/image";
import { parseItemChange, parseNewItem, parseTags, splitTags } from "@/features/inspiration/domain/validation";

/** Field rules from requirements/inspiration.md ("Fields and validation") and the INS-004 image rules. */
const KEY = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";

describe("articles (INS-003)", () => {
  it("parses the requirement's example: link gets https://, tags are lower-cased and split", () => {
    const parsed = parseNewItem({ kind: "article", title: " Designing calm interfaces ", link: "example.com/calm", body: "Text\n\nMore", notes: "Use fewer colors", tags: "Design, ui" });
    expect(parsed).toEqual({
      ok: true,
      value: { kind: "article", title: "Designing calm interfaces", link: "https://example.com/calm", body: "Text\n\nMore", notes: "Use fewer colors", tags: ["design", "ui"] },
    });
  });

  it("requires a title and checks every limit", () => {
    expect(parseNewItem({ kind: "article", title: "  " })).toEqual({ ok: false, errors: { title: "required" } });
    expect(parseNewItem({ kind: "article", title: "x".repeat(201) })).toEqual({ ok: false, errors: { title: "too_long" } });
    expect(parseNewItem({ kind: "article", title: "x", body: "😀".repeat(50_001) })).toEqual({ ok: false, errors: { body: "too_long" } });
    expect(parseNewItem({ kind: "article", title: "x", notes: "x".repeat(2001) })).toEqual({ ok: false, errors: { notes: "too_long" } });
    expect(parseNewItem({ kind: "article", title: "x", link: "javascript:alert(1)" })).toEqual({ ok: false, errors: { link: "invalid" } });
    expect(parseNewItem({ kind: "article", title: "x", body: "😀".repeat(50_000) })?.ok).toBe(true);
  });

  it("stores text NFC-normalized", () => {
    const parsed = parseNewItem({ kind: "article", title: "phở" });
    expect(parsed?.ok && parsed.value.title).toBe("phở".normalize("NFC"));
  });
});

describe("images (INS-004)", () => {
  it("needs a UUID key, takes no article text, and has an optional title", () => {
    expect(parseNewItem({ kind: "image", imageKey: KEY.toUpperCase() })).toEqual({
      ok: true,
      value: { kind: "image", imageKey: KEY, title: null, link: null, body: null, notes: null, tags: [] },
    });
    expect(parseNewItem({ kind: "image", imageKey: "../x" })).toBeNull();
    expect(parseNewItem({ kind: "image" })).toBeNull();
    expect(parseNewItem({ kind: "video" })).toBeNull();
    expect(parseNewItem({ kind: "article", title: "x", imageKey: KEY })).toBeNull();
    expect(parseNewItem({ kind: "image", imageKey: KEY, body: "text" })).toEqual({ ok: false, errors: { body: "invalid" } });
  });

  it("checks picked files and fits sizes without enlarging", () => {
    expect(pickProblem({ type: "image/heic", size: 1 })).toBe("type");
    expect(pickProblem({ type: "image/svg+xml", size: 1 })).toBe("type");
    expect(pickProblem({ type: "image/jpeg", size: 20 * 1024 * 1024 + 1 })).toBe("size");
    expect(pickProblem({ type: "image/gif", size: 20 * 1024 * 1024 })).toBeNull();
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032, 480)).toEqual({ width: 360, height: 480 });
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1, 480)).toEqual({ width: 480, height: 1 });
    expect(fitWithin(0, 600, 480)).toEqual({ width: 0, height: 0 });
  });

  it("builds paths only under the user's own folder", () => {
    expect(imagePaths("u", "k")).toEqual({ full: "u/k/full", thumb: "u/k/thumb" });
  });
});

describe("tags", () => {
  it("normalizes, de-duplicates and limits", () => {
    expect(splitTags(" Design, ,UI,design ")).toEqual(["design", "ui", "design"]);
    expect(parseTags(" Design, ,UI,design ", {})).toEqual(["design", "ui"]);
    expect(parseTags(["Đà Lạt", "ĐÀ LẠT"], {})).toEqual(["đà lạt"]);
    const errors = {};
    expect(parseTags(Array.from({ length: 11 }, (_, i) => `t${i}`), errors)).toBeUndefined();
    expect(errors).toEqual({ tags: "too_many" });
    const long = {};
    expect(parseTags(["x".repeat(33)], long)).toBeUndefined();
    expect(long).toEqual({ tags: "too_long" });
    const bad = {};
    expect(parseTags(["a\nb"], bad)).toBeUndefined();
    expect(bad).toEqual({ tags: "invalid" });
    expect(parseTags([1, 2], {})).toBeUndefined();
  });
});

describe("edits (INS-006)", () => {
  it("parses only present fields; an article's title can't be cleared; images take no text", () => {
    expect(parseItemChange({ notes: "" }, "article")).toEqual({ ok: true, value: { notes: null } });
    expect(parseItemChange({ title: "" }, "article")).toEqual({ ok: false, errors: { title: "required" } });
    expect(parseItemChange({ title: "" }, "image")).toEqual({ ok: true, value: { title: null } });
    expect(parseItemChange({ body: "x" }, "image")).toEqual({ ok: false, errors: { body: "invalid" } });
    expect(parseItemChange({}, "article")).toEqual({ ok: false, empty: true });
  });
});

describe("usage line (INS-009)", () => {
  it("formats bytes", () => {
    expect(formatBytes(512 * 1024)).toBe("512 KB");
    expect(formatBytes(48 * 1024 * 1024)).toBe("48 MB");
    expect(formatBytes(1.2 * 1024 * 1024 * 1024)).toBe("1.2 GB");
  });
});
