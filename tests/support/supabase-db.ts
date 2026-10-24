import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * In-process Postgres (PGlite) with the parts of Supabase that the migrations
 * and RLS rely on: the anon/authenticated roles, Supabase's default grants on
 * the public schema, auth.users and auth.uid() reading the request JWT claims
 * the way PostgREST sets them. Real migrations from supabase/migrations run on
 * top, so policies, grants and functions are exercised for real.
 *
 * Not covered: PostgREST itself, Supabase Auth, and Postgres-version
 * differences (PGlite is Postgres 18; Supabase runs 15 or 17).
 */
const BOOTSTRAP = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

grant usage on schema public to anon, authenticated, service_role;
-- Supabase grants these by default; migrations must revoke what they don't want.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- The parts of Supabase Storage's schema that migrations and policies use. The
-- Storage server itself (signed URLs, uploads) is not modelled: tests insert,
-- select and delete storage.objects rows as the caller, which is what the
-- server does under the caller's JWT for those operations.
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner_id text,
  metadata jsonb,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
`;

export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";

export type TestDb = {
  /** Runs as the database owner (fixtures only; bypasses RLS). */
  admin: PGlite;
  /** Runs one statement as `authenticated` with the given user, or as `anon` when userId is null. */
  as: <T = Record<string, unknown>>(userId: string | null, sql: string, params?: unknown[]) => Promise<T[]>;
};

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** Applies one migration file by name (for tests of a data migration). */
export async function applyMigration(db: TestDb, file: string): Promise<void> {
  await db.admin.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
}

/**
 * A fresh database with all migrations applied, or only those that sort
 * before `options.before` (a migration file name), so a test can add rows
 * first and then run that migration with applyMigration.
 */
export async function createTestDb(options: { before?: string } = {}): Promise<TestDb> {
  const admin = await PGlite.create();
  await admin.exec(BOOTSTRAP);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    if (options.before && file >= options.before) break;
    await admin.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  await admin.query("insert into auth.users (id, email) values ($1, 'a@example.test'), ($2, 'b@example.test')", [
    USER_A,
    USER_B,
  ]);

  async function as<T>(userId: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
    return admin.transaction(async (tx: Transaction) => {
      await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
      const claims = userId ? { sub: userId, role: "authenticated" } : { role: "anon" };
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      const result = await tx.query<T>(sql, params);
      return result.rows;
    });
  }

  return { admin, as };
}

/** Local date (YYYY-MM-DD) in UTC, offset by `days`. Tests call the functions with p_tz = 'UTC'. */
export function utcDate(days = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a YYYY-MM-DD date. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}
