import { describe, expect, it } from "vitest";
import {
  hasOnlyEventFields,
  isSafeLink,
  normalizeLink,
  padTime,
  parseEventChange,
  parseNewEvent,
} from "@/features/events/domain/validation";
import { decodeCursor, encodeCursor, toEventItem, type EventRow } from "@/features/events/server/queries";
import { formatDate } from "@/lib/dates";

/** Events field rules (requirements: Fields and validation) and the paging cursor. */
const valid = { title: "Bought a TV", date: "2026-10-13" };

describe("parseNewEvent (EVT-003)", () => {
  it("accepts the example event and normalizes optional fields", () => {
    const parsed = parseNewEvent({ ...valid, time: "", link: " shop.example.com/tv001 ", notes: "  Model plasma 2026 tv001\nPrice: 12.990.000 ₫ " });
    expect(parsed).toEqual({
      ok: true,
      value: {
        title: "Bought a TV",
        date: "2026-10-13",
        time: null,
        link: "https://shop.example.com/tv001",
        notes: "Model plasma 2026 tv001\nPrice: 12.990.000 ₫",
      },
    });
  });

  it("requires a title and a date", () => {
    expect(parseNewEvent({ title: "  ", date: "" })).toEqual({ ok: false, errors: { title: "required", date: "required" } });
  });

  it("counts code points, like Postgres", () => {
    expect(parseNewEvent({ ...valid, title: "😀".repeat(120) }).ok).toBe(true);
    expect(parseNewEvent({ ...valid, title: "😀".repeat(121) })).toMatchObject({ errors: { title: "too_long" } });
    expect(parseNewEvent({ ...valid, notes: "x".repeat(2001) })).toMatchObject({ errors: { notes: "too_long" } });
  });

  it("stores text as NFC so exact search matches either typing form", () => {
    const parsed = parseNewEvent({ ...valid, title: "phở" });
    expect(parsed.ok && parsed.value.title).toBe("phở");
  });

  it("allows past and future dates from 1900 to 2100 (decision 4, A2)", () => {
    for (const date of ["1900-01-01", "2026-12-20", "2100-12-31"]) expect(parseNewEvent({ ...valid, date }).ok).toBe(true);
    expect(parseNewEvent({ ...valid, date: "1899-12-31" })).toMatchObject({ errors: { date: "out_of_range" } });
    expect(parseNewEvent({ ...valid, date: "2101-01-01" })).toMatchObject({ errors: { date: "out_of_range" } });
    expect(parseNewEvent({ ...valid, date: "2026-02-30" })).toMatchObject({ errors: { date: "invalid" } });
    expect(parseNewEvent({ ...valid, date: "13 Oct 2026" })).toMatchObject({ errors: { date: "invalid" } });
  });

  it("takes 24-hour HH:mm times only", () => {
    expect(parseNewEvent({ ...valid, time: "07:45" }).ok).toBe(true);
    expect(parseNewEvent({ ...valid, time: "23:59" }).ok).toBe(true);
    for (const time of ["24:00", "7:5", "7:45", "07:45:00", "7.45pm", 745]) {
      expect(parseNewEvent({ ...valid, time })).toMatchObject({ errors: { time: "invalid" } });
    }
  });

  it("accepts only http(s) links with a host (A4)", () => {
    for (const link of ["javascript:alert(1)", "data:text/html,x", "mailto:a@b.test", "https://", "https://exa mple.com", "http:///path"]) {
      expect(parseNewEvent({ ...valid, link })).toMatchObject({ errors: { link: "invalid" } });
    }
    expect(parseNewEvent({ ...valid, link: `https://a.example/${"x".repeat(2040)}` })).toMatchObject({ errors: { link: "too_long" } });
    expect(parseNewEvent({ ...valid, link: "HTTP://Example.com/A" }).ok).toBe(true);
  });

  it("rejects non-string values instead of coercing them", () => {
    expect(parseNewEvent({ title: 5, date: valid.date })).toMatchObject({ errors: { title: "invalid" } });
    expect(parseNewEvent({ ...valid, notes: ["x"] })).toMatchObject({ errors: { notes: "invalid" } });
  });
});

describe("parseEventChange (EVT-005)", () => {
  it("parses only the fields present and clears optional ones", () => {
    expect(parseEventChange({ time: "", link: null, notes: "" })).toEqual({ ok: true, value: { time: null, link: null, notes: null } });
    expect(parseEventChange({ date: "2027-01-01" })).toEqual({ ok: true, value: { date: "2027-01-01" } });
  });

  it("never clears the title or date", () => {
    expect(parseEventChange({ title: "", date: null })).toEqual({ ok: false, errors: { title: "required", date: "required" } });
  });

  it("treats an empty change as a bad request", () => {
    expect(parseEventChange({})).toEqual({ ok: false, empty: true });
  });
});

describe("field helpers", () => {
  it("allowlists writable fields only", () => {
    expect(hasOnlyEventFields({ title: "x", date: "2026-01-01", time: null, link: null, notes: null })).toBe(true);
    expect(hasOnlyEventFields({ title: "x", user_id: "someone" })).toBe(false);
  });

  it("pads lenient times and adds https:// when the scheme is missing", () => {
    expect(padTime(" 7:45 ")).toBe("07:45");
    expect(padTime("7:5")).toBe("7:5");
    expect(normalizeLink("shop.example.com")).toBe("https://shop.example.com");
    expect(normalizeLink("http://a.example")).toBe("http://a.example");
    expect(normalizeLink("javascript:x")).toBe("javascript:x");
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
  });

  it("formats dates with fixed month names, never 'Sept'", () => {
    expect(formatDate("2026-09-27")).toBe("27 Sep 2026");
    expect(formatDate("2026-10-13")).toBe("13 Oct 2026");
  });
});

describe("paging cursor", () => {
  const row: EventRow = {
    id: "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10",
    title: "Bought a TV",
    event_date: "2026-10-13",
    event_time: "07:45:00",
    link: null,
    notes: null,
    created_at: "2026-10-13T10:00:00.123456+00:00",
    updated_at: "2026-10-13T10:00:00.123456+00:00",
    match_rank: 1,
  };

  it("round-trips the exact sort keys, including microseconds", () => {
    expect(decodeCursor(encodeCursor(row))).toEqual({ r: 1, d: "2026-10-13", t: "07:45:00", c: row.created_at, i: row.id });
  });

  it("rejects tampered or malformed cursors", () => {
    const bad = (value: unknown) => btoa(JSON.stringify(value));
    for (const cursor of ["not base64!", bad({ r: 3, d: "2026-10-13", t: null, c: row.created_at, i: row.id }), bad({ ...{ r: 2, d: "x", t: null, c: row.created_at, i: row.id } }), bad({ r: 2, d: "2026-10-13", t: null, c: row.created_at, i: "1; drop" }), bad(null)]) {
      expect(() => decodeCursor(cursor)).toThrowError(expect.objectContaining({ code: "invalid_request", status: 400 }));
    }
  });

  it("maps rows to the narrow view model", () => {
    expect(toEventItem(row, true)).toEqual({
      id: row.id,
      title: "Bought a TV",
      date: "2026-10-13",
      time: "07:45",
      link: null,
      notes: null,
      createdAt: "2026-10-13T10:00:00.123Z",
      updatedAt: "2026-10-13T10:00:00.123Z",
      match: "accent",
    });
    expect(toEventItem({ ...row, match_rank: 2 }, false).match).toBeNull();
  });
});
