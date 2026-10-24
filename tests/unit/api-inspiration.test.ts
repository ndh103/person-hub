import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "@/worker/app";

/**
 * The Inspiration API (src/worker/inspiration.ts) with Supabase (database and
 * Storage) replaced by a stub. These cover what the API adds: authentication
 * before any data access, the write guards, strict allowlists, body limits,
 * Storage paths derived from the session, upload checks on create, file
 * removal on delete, safe errors and no-store. Database and Storage
 * authorization is covered in supabase/tests/inspiration-rls.test.ts.
 */
const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
const bucket = {
  createSignedUploadUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
};
const storageFrom = vi.fn(() => bucket);
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getClaims }, rpc, from, storage: { from: storageFrom } }) }));

const SITE = "https://hub.example.test";
const ENV = { SUPABASE_URL: "https://project-ref.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
const TOKEN = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.c2ln";
const USER = "00000000-0000-4000-8000-00000000000a";
const OTHER = "00000000-0000-4000-8000-00000000000b";
const ID = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";
const KEY = "11111111-1111-4111-8111-111111111111";

const app = createApp();

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const all: Record<string, string> = {
    authorization: `Bearer ${TOKEN}`,
    origin: SITE,
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
    ...headers,
  };
  return app.request(
    `${SITE}${path}`,
    {
      method,
      headers: Object.fromEntries(Object.entries(all).filter(([, value]) => value !== "")),
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    },
    ENV,
  );
}

function signedIn() {
  getClaims.mockResolvedValue({ data: { claims: { sub: USER, role: "authenticated" } }, error: null });
}

const ROW = {
  id: ID,
  user_id: USER,
  kind: "image",
  title: "Morning light",
  link: null,
  body: null,
  notes: "Warm walls",
  tags: ["travel"],
  image_key: KEY,
  created_at: "2026-10-24T10:00:00.123456+00:00",
  updated_at: "2026-10-24T10:00:00.123456+00:00",
};

/** A PostgREST query builder stub: every method chains and records; awaiting it (or a terminal call) gives `result`. */
function builder(result: { data?: unknown; error?: unknown }) {
  const calls: [string, unknown[]][] = [];
  const settled = Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
  const chain: Record<string, unknown> = {};
  for (const name of ["insert", "update", "delete", "select", "eq"]) {
    chain[name] = (...args: unknown[]) => (calls.push([name, args]), chain);
  }
  for (const name of ["single", "maybeSingle"]) {
    chain[name] = (...args: unknown[]) => (calls.push([name, args]), settled);
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settled.then(resolve, reject);
  from.mockReturnValueOnce(chain);
  return calls;
}

function signsAll() {
  bucket.createSignedUrls.mockImplementation((paths: string[]) =>
    Promise.resolve({ data: paths.map((path) => ({ path, signedUrl: `${ENV.SUPABASE_URL}/storage/v1/object/sign/inspiration/${path}?token=t`, error: null })), error: null }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of [getClaims, rpc, from, ...Object.values(bucket)]) mock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("authentication and transport (INS-010)", () => {
  it("answers 401 with no-store before any data or Storage access", async () => {
    getClaims.mockResolvedValueOnce({ data: { claims: { sub: USER, role: "authenticated", is_anonymous: true } }, error: null });
    const responses = await Promise.all([
      call("POST", "/api/inspiration/query", {}),
      call("GET", "/api/inspiration/tags", undefined, { authorization: "" }),
      call("POST", "/api/inspiration/uploads", { contentType: "image/webp" }, { authorization: "" }),
      call("DELETE", `/api/inspiration/${ID}`, undefined, { authorization: "Bearer nope" }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("refuses a cross-site write and a non-JSON upload body", async () => {
    signedIn();
    expect((await call("POST", "/api/inspiration/uploads", { contentType: "image/webp" }, { origin: "https://evil.test" })).status).toBe(403);
    expect((await call("POST", "/api/inspiration", "x", { "content-type": "multipart/form-data; boundary=x" })).status).toBe(415);
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("has no GET route that takes search text in the URL, and 404s malformed ids without a database call", async () => {
    signedIn();
    expect((await call("GET", "/api/inspiration?q=design")).status).toBe(404);
    expect((await call("GET", "/api/inspiration/not-a-uuid")).status).toBe(404);
    expect((await call("DELETE", "/api/inspiration/uploads/..%2Fother")).status).toBe(404);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/inspiration/query (INS-002, INS-008)", () => {
  it("lists as the caller with narrow items, signed thumbnails from the caller's folder and a cursor", async () => {
    signedIn();
    signsAll();
    const rows = Array.from({ length: 31 }, (_, i) => ({
      id: `${ID.slice(0, -2)}${String(i).padStart(2, "0")}`,
      kind: i % 2 ? "article" : "image",
      title: `t${i}`,
      link: null,
      excerpt: null,
      has_body: false,
      tags: [],
      image_key: i % 2 ? null : KEY,
      created_at: ROW.created_at,
      updated_at: ROW.updated_at,
    }));
    rpc.mockImplementation((fn: string) => Promise.resolve(fn === "inspiration_page" ? { data: rows, error: null } : { data: 31, error: null }));
    const response = await call("POST", "/api/inspiration/query", { q: "  Hội An ", kind: "image", tag: " Travel " });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const page = (await response.json()) as { items: Record<string, unknown>[]; nextCursor: string; count: number };
    expect(page.items).toHaveLength(30);
    expect(page.count).toBe(31);
    expect(page.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Object.keys(page.items[0]).sort()).toEqual(["createdAt", "excerpt", "hasText", "id", "kind", "link", "tags", "thumbUrl", "title", "updatedAt"]);
    expect(page.items[0].thumbUrl).toContain(`${USER}/${KEY}/thumb`);
    expect(page.items[1].thumbUrl).toBeNull();
    expect(rpc).toHaveBeenCalledWith("inspiration_page", expect.objectContaining({ p_q: "Hội An", p_kind: "image", p_tag: "travel", p_limit: 31 }));
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(expect.any(Array), 3600);
    for (const path of bucket.createSignedUrls.mock.calls[0][0] as string[]) expect(path.startsWith(`${USER}/`)).toBe(true);
  });

  it("shows a broken thumbnail as null instead of failing the list", async () => {
    signedIn();
    rpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "inspiration_page" ? { data: [{ ...ROW, excerpt: null, has_body: false }], error: null } : { data: 1, error: null }),
    );
    bucket.createSignedUrls.mockResolvedValue({ data: null, error: { statusCode: "500", message: `failed ${USER}/${KEY}` } });
    const response = await call("POST", "/api/inspiration/query", {});
    expect(response.status).toBe(200);
    expect(((await response.json()) as { items: { thumbUrl: unknown }[] }).items[0].thumbUrl).toBeNull();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(USER);
  });

  it("rejects unknown fields, bad kinds, long text and forged cursors", async () => {
    signedIn();
    for (const bad of [{ user_id: OTHER }, { kind: "video" }, { q: "x".repeat(101) }, { tag: "x".repeat(33) }, { cursor: "not-base64!" }, { cursor: btoa('{"c":"x","i":"y"}') }]) {
      expect((await call("POST", "/api/inspiration/query", bad)).status).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("uploads (INS-004, ADR-0009)", () => {
  it("issues two signed upload URLs in the caller's own folder under a server-made key", async () => {
    signedIn();
    bucket.createSignedUploadUrl.mockImplementation((path: string) => Promise.resolve({ data: { path, token: "tok", signedUrl: "u" }, error: null }));
    const response = await call("POST", "/api/inspiration/uploads", { contentType: "image/jpeg" });
    expect(response.status).toBe(201);
    const target = (await response.json()) as { key: string; full: { path: string }; thumb: { path: string } };
    expect(target.full.path).toBe(`${USER}/${target.key}/full`);
    expect(target.thumb.path).toBe(`${USER}/${target.key}/thumb`);
    expect(storageFrom).toHaveBeenCalledWith("inspiration");
  });

  it("accepts no caller-chosen path or other content type", async () => {
    signedIn();
    for (const bad of [{ contentType: "image/svg+xml" }, { contentType: "image/png" }, { contentType: "image/webp", path: `${OTHER}/x/full` }, {}]) {
      expect((await call("POST", "/api/inspiration/uploads", bad)).status).toBe(400);
    }
    expect(bucket.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("discards an unsaved upload from the caller's folder, but never one an entry uses", async () => {
    signedIn();
    builder({ data: null });
    bucket.remove.mockResolvedValue({ data: [], error: null });
    expect((await call("DELETE", `/api/inspiration/uploads/${KEY}`)).status).toBe(200);
    expect(bucket.remove).toHaveBeenCalledWith([`${USER}/${KEY}/full`, `${USER}/${KEY}/thumb`]);

    builder({ data: { id: ID } });
    expect((await call("DELETE", `/api/inspiration/uploads/${KEY}`)).status).toBe(200);
    expect(bucket.remove).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/inspiration (INS-003, INS-004)", () => {
  it("saves an article as the caller with only allowlisted columns", async () => {
    signedIn();
    const calls = builder({ data: { ...ROW, kind: "article", title: "Calm", image_key: null, body: "Text", tags: ["design"] } });
    const response = await call("POST", "/api/inspiration", { kind: "article", title: "Calm", body: "Text", tags: "Design" });
    expect(response.status).toBe(201);
    expect(calls[0]).toEqual(["insert", [{ kind: "article", title: "Calm", link: null, body: "Text", notes: null, tags: ["design"] }]]);
    expect(((await response.json()) as { item: { hasText: boolean } }).item.hasText).toBe(true);
  });

  it("rejects spoofed ownership, unknown fields and field errors before writing", async () => {
    signedIn();
    expect((await call("POST", "/api/inspiration", { kind: "article", title: "x", user_id: OTHER })).status).toBe(400);
    expect((await call("POST", "/api/inspiration", { kind: "article", title: "x", image_bytes: 1 })).status).toBe(400);
    expect((await call("POST", "/api/inspiration", { kind: "image", imageKey: `${OTHER}/x` })).status).toBe(400);
    const invalid = await call("POST", "/api/inspiration", { kind: "article", title: "", tags: Array.from({ length: 11 }, (_, i) => `t${i}`) });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual({ error: "validation", fields: { title: "required", tags: "too_many" } });
    expect(from).not.toHaveBeenCalled();
  });

  it("accepts long article text up to the item body limit and refuses more", async () => {
    signedIn();
    builder({ data: { ...ROW, kind: "article", image_key: null } });
    expect((await call("POST", "/api/inspiration", { kind: "article", title: "x", body: "ở".repeat(50_000) })).status).toBe(201);
    expect((await call("POST", "/api/inspiration", { kind: "article", title: "x", body: "x".repeat(300_000) })).status).toBe(400);
  });

  it("saves an image only when both files are in the caller's folder, recording their size", async () => {
    signedIn();
    signsAll();
    bucket.list.mockResolvedValue({
      data: [
        { name: "full", metadata: { size: 400_000, mimetype: "image/webp" } },
        { name: "thumb", metadata: { size: 30_000, mimetype: "image/webp" } },
      ],
      error: null,
    });
    const calls = builder({ data: ROW });
    const response = await call("POST", "/api/inspiration", { kind: "image", imageKey: KEY, title: "Morning light", tags: ["travel"] });
    expect(response.status).toBe(201);
    expect(bucket.list).toHaveBeenCalledWith(`${USER}/${KEY}`, expect.anything());
    expect(calls[0][1][0]).toMatchObject({ kind: "image", image_key: KEY, image_bytes: 430_000, body: null });
    expect(((await response.json()) as { item: { thumbUrl: string } }).item.thumbUrl).toContain(`${USER}/${KEY}/thumb`);
  });

  it("answers 409 when an upload is missing, has the wrong type, or the key is already used", async () => {
    signedIn();
    bucket.list.mockResolvedValueOnce({ data: [{ name: "full", metadata: { size: 1, mimetype: "image/webp" } }], error: null });
    expect((await call("POST", "/api/inspiration", { kind: "image", imageKey: KEY })).status).toBe(409);
    bucket.list.mockResolvedValueOnce({
      data: [
        { name: "full", metadata: { size: 1, mimetype: "text/html" } },
        { name: "thumb", metadata: { size: 1, mimetype: "image/webp" } },
      ],
      error: null,
    });
    expect((await call("POST", "/api/inspiration", { kind: "image", imageKey: KEY })).status).toBe(409);
    expect(from).not.toHaveBeenCalled();
    bucket.list.mockResolvedValueOnce({
      data: [
        { name: "full", metadata: { size: 1, mimetype: "image/jpeg" } },
        { name: "thumb", metadata: { size: 1, mimetype: "image/jpeg" } },
      ],
      error: null,
    });
    builder({ error: { code: "23505", message: "duplicate key inspiration_items_image_key_unique" } });
    const duplicate = await call("POST", "/api/inspiration", { kind: "image", imageKey: KEY });
    expect(duplicate.status).toBe(409);
    expect(JSON.stringify(await duplicate.json())).not.toContain("inspiration_items");
  });
});

describe("GET, PATCH and DELETE /api/inspiration/:id (INS-005 to INS-007)", () => {
  it("returns the detail with a signed full image, and 404 for a missing or another user's entry", async () => {
    signedIn();
    signsAll();
    builder({ data: ROW });
    const response = await call("GET", `/api/inspiration/${ID}`);
    expect(response.status).toBe(200);
    const { item } = (await response.json()) as { item: Record<string, unknown> };
    expect(item.imageUrl).toContain(`${USER}/${KEY}/full`);
    expect(item).not.toHaveProperty("user_id");
    expect(item).not.toHaveProperty("image_key");

    builder({ data: null });
    expect((await call("GET", `/api/inspiration/${ID}`)).status).toBe(404);
  });

  it("updates allowlisted text only and refuses article text on an image", async () => {
    signedIn();
    builder({ data: ROW });
    const imageText = await call("PATCH", `/api/inspiration/${ID}`, { body: "text" });
    expect(imageText.status).toBe(422);
    expect((await call("PATCH", `/api/inspiration/${ID}`, { kind: "article" })).status).toBe(400);
    expect((await call("PATCH", `/api/inspiration/${ID}`, { image_key: KEY })).status).toBe(400);

    signsAll();
    builder({ data: ROW });
    const calls = builder({ data: { ...ROW, notes: null } });
    expect((await call("PATCH", `/api/inspiration/${ID}`, { notes: "", tags: "Travel, Light" })).status).toBe(200);
    expect(calls[0]).toEqual(["update", [{ notes: null, tags: ["travel", "light"] }]]);
  });

  it("deletes the row first, then its files, and still succeeds if Storage fails", async () => {
    signedIn();
    builder({ data: [{ user_id: USER, image_key: KEY }] });
    bucket.remove.mockResolvedValue({ data: null, error: { statusCode: "503", message: `${USER}/${KEY}/full` } });
    const response = await call("DELETE", `/api/inspiration/${ID}`);
    expect(response.status).toBe(200);
    expect(bucket.remove).toHaveBeenCalledWith([`${USER}/${KEY}/full`, `${USER}/${KEY}/thumb`]);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(KEY);

    builder({ data: [] });
    expect((await call("DELETE", `/api/inspiration/${ID}`)).status).toBe(200);
    expect(bucket.remove).toHaveBeenCalledTimes(1);
  });

  it("never sends database text to the client", async () => {
    signedIn();
    builder({ error: { code: "XX000", message: "secret notes in error" } });
    const response = await call("GET", `/api/inspiration/${ID}`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });
});
