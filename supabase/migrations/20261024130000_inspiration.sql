-- Inspiration: saved articles and images. Requirements: requirements/inspiration.md (INS-001 to INS-011).
-- Decisions: docs/architecture/decisions/ADR-0004-events-table-writes-under-rls.md (table writes under owner RLS)
--            docs/architecture/decisions/ADR-0009-inspiration-image-storage.md (private bucket, signed URLs)
--   * Users write the table directly under owner RLS; column grants limit what each operation may set.
--     CHECK constraints are the authority for every field rule.
--   * Search and paging are SECURITY INVOKER functions, so RLS applies inside them.
--   * Image files live in the private bucket `inspiration` under `<user id>/<image key>/{full,thumb}`;
--     storage policies confine every user to their own first-level folder.

create schema inspiration_private;
revoke all on schema inspiration_private from public, anon, authenticated;
grant usage on schema inspiration_private to authenticated;

-- Accent folding, the same rule as events_private.fold (Events A13), kept per module.
-- normalize() must stay unqualified: it is SQL-standard syntax (NFD is a keyword).
create function inspiration_private.fold(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select pg_catalog.lower(pg_catalog.translate(
    pg_catalog.regexp_replace(normalize(t, NFD), '[' || pg_catalog.chr(768) || '-' || pg_catalog.chr(879) || ']', '', 'g'),
    'đĐ', 'dD'))
$$;

-- The searchable text of an entry. Declared immutable for the generated column:
-- array_to_string over text[] has no locale or setting dependence.
create function inspiration_private.search_text(p_title text, p_notes text, p_body text, p_tags text[]) returns text
language sql immutable parallel safe set search_path = '' as $$
  select inspiration_private.fold(
    coalesce(p_title, '') || ' ' || coalesce(p_notes, '') || ' ' || coalesce(p_body, '') || ' ' ||
    pg_catalog.array_to_string(coalesce(p_tags, '{}'::text[]), ' '))
$$;

-- Tags (INS fields table): at most 10; each 1–32 code points, trimmed, NFC, no comma or line break; no duplicates.
-- Lower-casing is done by the Worker (Postgres lower() depends on the collation).
create function inspiration_private.valid_tags(p_tags text[]) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select p_tags is not null
     and pg_catalog.cardinality(p_tags) <= 10
     and pg_catalog.array_position(p_tags, null) is null
     and not exists (
       select 1 from pg_catalog.unnest(p_tags) as t(tag)
       where pg_catalog.char_length(t.tag) not between 1 and 32
          or t.tag <> pg_catalog.btrim(t.tag)
          or pg_catalog.strpos(t.tag, ',') > 0
          or t.tag ~ '[\r\n]'
          or not (t.tag is nfc normalized))
     and (select pg_catalog.count(distinct t.tag) from pg_catalog.unnest(p_tags) as t(tag)) = pg_catalog.cardinality(p_tags)
$$;

revoke all on function inspiration_private.fold(text) from public, anon, authenticated;
revoke all on function inspiration_private.search_text(text, text, text, text[]) from public, anon, authenticated;
revoke all on function inspiration_private.valid_tags(text[]) from public, anon, authenticated;
grant execute on function inspiration_private.fold(text) to authenticated;
grant execute on function inspiration_private.search_text(text, text, text, text[]) to authenticated;
grant execute on function inspiration_private.valid_tags(text[]) to authenticated;

create table public.inspiration_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('article', 'image')),
  title text check (title is null or (char_length(title) between 1 and 200 and btrim(title) <> '' and title is nfc normalized)),
  link text check (link is null or (char_length(link) <= 2048 and link ~ '^https?://[^/?#[:space:]]+')),
  body text check (body is null or (char_length(body) between 1 and 50000 and body is nfc normalized)),
  notes text check (notes is null or (char_length(notes) between 1 and 2000 and notes is nfc normalized)),
  tags text[] not null default '{}' check (inspiration_private.valid_tags(tags)),
  image_key uuid,
  image_bytes integer check (image_bytes is null or image_bytes between 0 and 10485760),
  search_folded text generated always as (inspiration_private.search_text(title, notes, body, tags)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspiration_items_article_title check (kind <> 'article' or title is not null),
  constraint inspiration_items_body_article_only check (kind = 'article' or body is null),
  constraint inspiration_items_image_fields check (
    (kind = 'image') = (image_key is not null) and (kind = 'image') = (image_bytes is not null)),
  constraint inspiration_items_image_key_unique unique (user_id, image_key)
);
create index inspiration_items_user_order_idx on public.inspiration_items (user_id, created_at desc, id desc);

create function inspiration_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.now(); return new; end $$;
create trigger inspiration_items_touch_updated_at before update on public.inspiration_items
  for each row execute function inspiration_private.touch_updated_at();

alter table public.inspiration_items enable row level security;
revoke all on table public.inspiration_items from public, anon, authenticated;
grant select, delete on table public.inspiration_items to authenticated;
grant insert (kind, title, link, body, notes, tags, image_key, image_bytes) on table public.inspiration_items to authenticated;
grant update (title, link, body, notes, tags) on table public.inspiration_items to authenticated;

create policy inspiration_items_select_own on public.inspiration_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy inspiration_items_insert_own on public.inspiration_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy inspiration_items_update_own on public.inspiration_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy inspiration_items_delete_own on public.inspiration_items for delete to authenticated
  using (user_id = (select auth.uid()));

-- Search, filter and paging (INS-002, INS-008). Ordered created_at desc, id desc.
create function public.inspiration_page(
  p_q text default null, p_kind text default null, p_tag text default null,
  p_after_created timestamptz default null, p_after_id uuid default null, p_limit integer default 30)
returns table (id uuid, kind text, title text, link text, excerpt text, has_body boolean, tags text[],
               image_key uuid, created_at timestamptz, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with p as (select nullif(pg_catalog.btrim(normalize(coalesce(p_q, ''), NFC)), '') as q)
  select i.id, i.kind, i.title, i.link,
         pg_catalog.left(coalesce(i.notes, i.body), 280), i.body is not null, i.tags,
         i.image_key, i.created_at, i.updated_at
  from public.inspiration_items i cross join p
  where (p.q is null or pg_catalog.strpos(i.search_folded, inspiration_private.fold(p.q)) > 0)
    and (p_kind is null or i.kind = p_kind)
    and (p_tag is null or i.tags @> array[p_tag])
    and (p_after_id is null or (i.created_at, i.id) < (p_after_created, p_after_id))
  order by i.created_at desc, i.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 101)
$$;

create function public.inspiration_count(p_q text default null, p_kind text default null, p_tag text default null)
returns integer
language sql stable security invoker set search_path = '' as $$
  with p as (select nullif(pg_catalog.btrim(normalize(coalesce(p_q, ''), NFC)), '') as q)
  select pg_catalog.count(*)::integer
  from public.inspiration_items i cross join p
  where (p.q is null or pg_catalog.strpos(i.search_folded, inspiration_private.fold(p.q)) > 0)
    and (p_kind is null or i.kind = p_kind)
    and (p_tag is null or i.tags @> array[p_tag])
$$;

create function public.inspiration_tags()
returns table (tag text, uses integer)
language sql stable security invoker set search_path = '' as $$
  select t.tag, pg_catalog.count(*)::integer as uses
  from public.inspiration_items i cross join lateral pg_catalog.unnest(i.tags) as t(tag)
  group by t.tag
  order by uses desc, t.tag
  limit 200
$$;

create function public.inspiration_usage() returns bigint
language sql stable security invoker set search_path = '' as $$
  select coalesce(pg_catalog.sum(i.image_bytes), 0)::bigint from public.inspiration_items i
$$;

revoke all on function public.inspiration_page(text, text, text, timestamptz, uuid, integer) from public, anon;
revoke all on function public.inspiration_count(text, text, text) from public, anon;
revoke all on function public.inspiration_tags() from public, anon;
revoke all on function public.inspiration_usage() from public, anon;
grant execute on function public.inspiration_page(text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.inspiration_count(text, text, text) to authenticated;
grant execute on function public.inspiration_tags() to authenticated;
grant execute on function public.inspiration_usage() to authenticated;

-- Storage (ADR-0009). Private bucket; the bucket limits are the authority for size and type.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspiration', 'inspiration', false, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Owner-folder policies: the first path segment is the owner's user id. No update policy: no overwrites.
create policy inspiration_objects_select_own on storage.objects for select to authenticated
  using (bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy inspiration_objects_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy inspiration_objects_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid()::text));
