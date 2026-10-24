import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, USER_A, USER_B, type TestDb } from "../../tests/support/supabase-db";

/**
 * INS-010 and the INS-008 search rules, run against the real migration in an
 * in-process Postgres (see tests/support/supabase-db.ts, which stubs the
 * Storage schema). Every check uses the caller's own role and JWT claims,
 * never the owner role (ADR-0004, ADR-0009).
 */
let db: TestDb;

async function sqlState(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
  return "ok";
}

type PageRow = { id: string; kind: string; title: string | null; excerpt: string | null; has_body: boolean; tags: string[]; created_at: string };

const ARTICLE = "insert into public.inspiration_items (kind, title, link, body, notes, tags) values ('article', $1, $2, $3, $4, $5) returning id";
const IMAGE = "insert into public.inspiration_items (kind, title, image_key, image_bytes, tags) values ('image', $1, $2, $3, $4) returning id";

async function addArticle(userId: string, title: string, body: string | null = null, notes: string | null = null, tags: string[] = []) {
  return (await db.as<{ id: string }>(userId, ARTICLE, [title, null, body, notes, tags]))[0].id;
}

async function addImage(userId: string, title: string | null, key: string, bytes: number, tags: string[] = []) {
  return (await db.as<{ id: string }>(userId, IMAGE, [title, key, bytes, tags]))[0].id;
}

function page(userId: string, q: string | null = null, kind: string | null = null, tag: string | null = null, after: PageRow | null = null, limit = 30) {
  return db.as<PageRow>(userId, "select * from public.inspiration_page($1, $2, $3, $4, $5, $6)", [
    q,
    kind,
    tag,
    after?.created_at ?? null,
    after?.id ?? null,
    limit,
  ]);
}

const KEY_A = "11111111-1111-4111-8111-111111111111";
const KEY_B = "22222222-2222-4222-8222-222222222222";
let aArticle: string;
let aImage: string;

beforeAll(async () => {
  db = await createTestDb();
  aArticle = await addArticle(USER_A, "Designing calm interfaces", "Use fewer colors.", "Whitespace carries hierarchy", ["design", "ui"]);
  await addArticle(USER_A, "Ăn chậm, sống chậm", "Bữa cơm gia đình", null, ["cooking"]);
  aImage = await addImage(USER_A, "Morning light in Hội An", KEY_A, 400_000, ["travel", "design"]);
  await addImage(USER_A, null, "33333333-3333-4333-8333-333333333333", 300_000);
  await addImage(USER_B, "B private", KEY_B, 900_000, ["design"]);
});

describe("ownership (INS-010)", () => {
  it("lets each user read, search, count, tag and measure only their own entries", async () => {
    expect((await db.as<{ n: number }>(USER_B, "select count(*)::int as n from public.inspiration_items"))[0].n).toBe(1);
    expect((await page(USER_B)).map((row) => row.title)).toEqual(["B private"]);
    expect(await db.as(USER_B, "select * from public.inspiration_count()")).toEqual([{ inspiration_count: 1 }]);
    expect(await db.as(USER_B, "select * from public.inspiration_tags()")).toEqual([{ tag: "design", uses: 1 }]);
    expect(await db.as(USER_B, "select public.inspiration_usage() as bytes")).toEqual([{ bytes: 900_000 }]);
    expect(await db.as(USER_B, "select id from public.inspiration_items where id = $1", [aArticle])).toEqual([]);
  });

  it("does not let another user update or delete an entry", async () => {
    expect(await db.as(USER_B, "update public.inspiration_items set title = 'x' where id = $1 returning id", [aArticle])).toEqual([]);
    expect(await db.as(USER_B, "delete from public.inspiration_items where id = $1 returning id", [aImage])).toEqual([]);
    expect((await db.as<{ title: string }>(USER_A, "select title from public.inspiration_items where id = $1", [aArticle]))[0].title).toBe(
      "Designing calm interfaces",
    );
  });

  it("refuses writes to ownership, kind, image fields, ids and timestamps", async () => {
    expect(await sqlState(db.as(USER_A, "update public.inspiration_items set user_id = $1 where id = $2", [USER_B, aArticle]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.inspiration_items set kind = 'image' where id = $1", [aArticle]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.inspiration_items set image_key = $1 where id = $2", [KEY_B, aImage]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.inspiration_items set image_bytes = 1 where id = $1", [aImage]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.inspiration_items set created_at = now() where id = $1", [aArticle]))).toBe("42501");
    expect(
      await sqlState(db.as(USER_A, "insert into public.inspiration_items (user_id, kind, title) values ($1, 'article', 'x')", [USER_B])),
    ).toBe("42501");
    expect(
      await sqlState(db.as(USER_A, "insert into public.inspiration_items (id, kind, title) values (gen_random_uuid(), 'article', 'x')")),
    ).toBe("42501");
  });

  it("gives signed-out callers nothing", async () => {
    expect(await sqlState(db.as(null, "select * from public.inspiration_items"))).toBe("42501");
    expect(await sqlState(db.as(null, ARTICLE, ["x", null, null, null, []]))).toBe("42501");
    for (const fn of ["inspiration_page()", "inspiration_count()", "inspiration_tags()", "inspiration_usage()"]) {
      expect(await sqlState(db.as(null, `select * from public.${fn}`))).toBe("42501");
    }
  });

  it("scopes image keys per user, so a key can't collide with or point into another user's folder", async () => {
    // B reusing A's key is allowed (it names B's own folder) and doesn't touch A's entry.
    expect(await sqlState(addImage(USER_B, "same key", KEY_A, 1))).toBe("ok");
    expect(await sqlState(addImage(USER_A, "dup", KEY_A, 1))).toBe("23505");
  });
});

describe("constraints are the authority for direct writes (ADR-0004)", () => {
  const article: [string, unknown[]][] = [
    ["an article without a title", [null, null, null, null, []]],
    ["a blank title", ["   ", null, null, null, []]],
    ["a title over 200", ["x".repeat(201), null, null, null, []]],
    ["a title not NFC", ["phở", null, null, null, []]],
    ["a javascript: link", ["x", "javascript:alert(1)", null, null, []]],
    ["text over 50,000", ["x", null, "x".repeat(50_001), null, []]],
    ["empty text", ["x", null, "", null, []]],
    ["notes over 2000", ["x", null, null, "x".repeat(2001), []]],
    ["11 tags", ["x", null, null, null, Array.from({ length: 11 }, (_, i) => `t${i}`)]],
    ["a tag over 32", ["x", null, null, null, ["x".repeat(33)]]],
    ["an empty tag", ["x", null, null, null, [""]]],
    ["an untrimmed tag", ["x", null, null, null, [" design"]]],
    ["a tag with a comma", ["x", null, null, null, ["a,b"]]],
    ["a tag with a line break", ["x", null, null, null, ["a\nb"]]],
    ["duplicate tags", ["x", null, null, null, ["ui", "ui"]]],
  ];
  it.each(article)("rejects %s", async (_name, params) => {
    expect(await sqlState(db.as(USER_A, ARTICLE, params))).toBe("23514");
  });

  it("rejects a null tag, image fields on an article and text on an image", async () => {
    expect(await sqlState(db.as(USER_A, ARTICLE, ["x", null, null, null, ["a", null]]))).toBe("23514");
    expect(
      await sqlState(db.as(USER_A, "insert into public.inspiration_items (kind, title, image_key, image_bytes) values ('article', 'x', $1, 1)", [KEY_B])),
    ).toBe("23514");
    expect(
      await sqlState(db.as(USER_A, "insert into public.inspiration_items (kind, body, image_key, image_bytes) values ('image', 'text', $1, 1)", [KEY_B])),
    ).toBe("23514");
    expect(await sqlState(db.as(USER_A, "insert into public.inspiration_items (kind) values ('image')"))).toBe("23514");
    expect(await sqlState(db.as(USER_A, "insert into public.inspiration_items (kind, title) values ('video', 'x')"))).toBe("23514");
    expect(await sqlState(addImage(USER_A, null, "44444444-4444-4444-8444-444444444444", 10_485_761))).toBe("23514");
  });

  it("accepts the edges of every range", async () => {
    const tags = Array.from({ length: 10 }, (_, i) => `${"x".repeat(31)}${i}`);
    expect(await sqlState(db.as(USER_B, ARTICLE, ["x".repeat(200), "http://localhost", "😀".repeat(50_000), "x".repeat(2000), tags]))).toBe("ok");
  });

  it("maintains updated_at", async () => {
    const id = await addArticle(USER_B, "Owner check");
    const [row] = await db.as<{ user_id: string; updated_at: string }>(USER_B, "select user_id, updated_at from public.inspiration_items where id = $1", [id]);
    expect(row.user_id).toBe(USER_B);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await db.as(USER_B, "update public.inspiration_items set notes = 'changed' where id = $1", [id]);
    const [after] = await db.as<{ updated_at: string }>(USER_B, "select updated_at from public.inspiration_items where id = $1", [id]);
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(row.updated_at).getTime());
  });
});

describe("search, filters and paging (INS-002, INS-008)", () => {
  it("lists newest first with a short excerpt and no article text", async () => {
    const rows = await page(USER_A);
    expect(rows.map((row) => row.title)).toEqual([null, "Morning light in Hội An", "Ăn chậm, sống chậm", "Designing calm interfaces"]);
    const calm = rows.find((row) => row.id === aArticle)!;
    expect(calm.excerpt).toBe("Whitespace carries hierarchy");
    expect(calm.has_body).toBe(true);
    expect(Object.keys(calm)).not.toContain("body");
  });

  it("matches title, notes, text and tags, ignoring case and Vietnamese accents", async () => {
    expect((await page(USER_A, "CALM")).map((row) => row.title)).toEqual(["Designing calm interfaces"]);
    expect((await page(USER_A, "fewer colors")).map((row) => row.title)).toEqual(["Designing calm interfaces"]);
    expect((await page(USER_A, "hoi an")).map((row) => row.title)).toEqual(["Morning light in Hội An"]);
    expect((await page(USER_A, "gia dinh")).map((row) => row.title)).toEqual(["Ăn chậm, sống chậm"]);
    expect((await page(USER_A, "cooking")).map((row) => row.title)).toEqual(["Ăn chậm, sống chậm"]);
    expect(await page(USER_A, "%")).toEqual([]);
  });

  it("filters by kind and tag, alone and with search", async () => {
    expect((await page(USER_A, null, "article")).map((row) => row.kind)).toEqual(["article", "article"]);
    expect((await page(USER_A, null, "image")).length).toBe(2);
    expect((await page(USER_A, null, null, "design")).map((row) => row.title)).toEqual(["Morning light in Hội An", "Designing calm interfaces"]);
    expect((await page(USER_A, "light", "image", "design")).map((row) => row.title)).toEqual(["Morning light in Hội An"]);
    expect(await page(USER_A, "light", "article", "design")).toEqual([]);
    expect(await db.as(USER_A, "select public.inspiration_count(null, null, 'design') as n")).toEqual([{ n: 2 }]);
    expect(await db.as(USER_A, "select * from public.inspiration_tags()")).toEqual([
      { tag: "design", uses: 2 },
      { tag: "cooking", uses: 1 },
      { tag: "travel", uses: 1 },
      { tag: "ui", uses: 1 },
    ]);
  });

  it("pages with a keyset without gaps or repeats", async () => {
    const all = (await page(USER_A)).map((row) => row.id);
    const seen: string[] = [];
    let after: PageRow | null = null;
    for (let i = 0; i < 10; i++) {
      const rows = await page(USER_A, null, null, null, after, 1);
      if (!rows.length) break;
      seen.push(...rows.map((row) => row.id));
      after = rows[rows.length - 1];
    }
    expect(seen).toEqual(all);
    expect((await page(USER_A, null, null, null, null, 100_000)).length).toBeLessThanOrEqual(101);
  });
});

describe("storage bucket and policies (ADR-0009)", () => {
  const INSERT_OBJECT = "insert into storage.objects (bucket_id, name, owner_id) values ($1, $2, $3) returning id";

  it("creates a private bucket limited to 5 MB WebP and JPEG", async () => {
    const [bucket] = (await db.admin.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'inspiration'")).rows;
    expect(bucket).toEqual({ public: false, file_size_limit: 5242880, allowed_mime_types: ["image/webp", "image/jpeg"] });
  });

  it("lets a user write, read and delete only inside their own folder", async () => {
    expect(await sqlState(db.as(USER_A, INSERT_OBJECT, ["inspiration", `${USER_A}/${KEY_A}/full`, USER_A]))).toBe("ok");
    expect(await sqlState(db.as(USER_A, INSERT_OBJECT, ["inspiration", `${USER_B}/${KEY_B}/full`, USER_A]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, INSERT_OBJECT, ["inspiration", "full", USER_A]))).toBe("42501");
    expect(await sqlState(db.as(USER_B, INSERT_OBJECT, ["inspiration", `${USER_B}/${KEY_B}/full`, USER_B]))).toBe("ok");

    expect((await db.as<{ name: string }>(USER_A, "select name from storage.objects")).map((row) => row.name)).toEqual([`${USER_A}/${KEY_A}/full`]);
    expect(await db.as(USER_A, "delete from storage.objects where name = $1 returning name", [`${USER_B}/${KEY_B}/full`])).toEqual([]);
    expect(await db.as(USER_B, "select name from storage.objects where name like $1", [`${USER_A}/%`])).toEqual([]);
  });

  it("allows no overwrite and nothing for signed-out callers or other buckets", async () => {
    expect(await db.as(USER_A, "update storage.objects set name = name returning id")).toEqual([]);
    expect(await sqlState(db.as(null, INSERT_OBJECT, ["inspiration", `${USER_A}/x/full`, null]))).toBe("42501");
    expect(await db.as(null, "select name from storage.objects")).toEqual([]);
    await db.admin.query("insert into storage.buckets (id, name) values ('other', 'other')");
    expect(await sqlState(db.as(USER_A, INSERT_OBJECT, ["other", `${USER_A}/x/full`, USER_A]))).toBe("42501");
  });

  it("lets the owner delete their own objects (entry delete and discarded uploads)", async () => {
    expect(await db.as(USER_A, "delete from storage.objects where name = $1 returning name", [`${USER_A}/${KEY_A}/full`])).toEqual([
      { name: `${USER_A}/${KEY_A}/full` },
    ]);
  });
});
