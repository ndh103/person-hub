-- Events: life events log. Requirements: requirements/events.md (EVT-001 to EVT-009).
-- Decision: docs/architecture/decisions/ADR-0004-events-table-writes-under-rls.md
--   * Users write the table directly under owner RLS; column grants allow only
--     title, event_date, event_time, link, notes. CHECK constraints are the authority.
--   * Search and paging are SECURITY INVOKER functions, so RLS applies inside them.

create schema events_private;
revoke all on schema events_private from public, anon, authenticated;
grant usage on schema events_private to authenticated;

-- Accent folding (A13): strip combining marks U+0300–U+036F after NFD, đ → d, lower-case.
-- normalize() must stay unqualified: it is SQL-standard syntax (NFD is a keyword).
create function events_private.fold(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select pg_catalog.lower(pg_catalog.translate(
    pg_catalog.regexp_replace(normalize(t, NFD), '[' || pg_catalog.chr(768) || '-' || pg_catalog.chr(879) || ']', '', 'g'),
    'đĐ', 'dD'))
$$;
revoke all on function events_private.fold(text) from public, anon, authenticated;
grant execute on function events_private.fold(text) to authenticated;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120 and btrim(title) <> '' and title is nfc normalized),
  event_date date not null check (event_date between date '1900-01-01' and date '2100-12-31'),
  event_time time(0) check (event_time is null or extract(second from event_time) = 0),
  link text check (link is null or (char_length(link) <= 2048 and link ~ '^https?://[^/?#[:space:]]+')),
  notes text check (notes is null or (char_length(notes) between 1 and 2000 and notes is nfc normalized)),
  search_folded text generated always as (events_private.fold(title || ' ' || coalesce(notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_user_order_idx on public.events (user_id, event_date desc, created_at desc);

create function events_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.now(); return new; end $$;
create trigger events_touch_updated_at before update on public.events
  for each row execute function events_private.touch_updated_at();

alter table public.events enable row level security;
revoke all on table public.events from public, anon, authenticated;
grant select, delete on table public.events to authenticated;
grant insert (title, event_date, event_time, link, notes) on table public.events to authenticated;
grant update (title, event_date, event_time, link, notes) on table public.events to authenticated;

create policy events_select_own on public.events for select to authenticated
  using (user_id = (select auth.uid()));
create policy events_insert_own on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy events_update_own on public.events for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy events_delete_own on public.events for delete to authenticated
  using (user_id = (select auth.uid()));

-- match_rank: 2 = exact (case-insensitive), 1 = only after accent folding. No search text: every row is 2.
create function public.events_search(p_q text default null, p_year integer default null)
returns table (id uuid, title text, event_date date, event_time time, link text, notes text,
               created_at timestamptz, updated_at timestamptz, match_rank integer)
language sql stable security invoker set search_path = '' as $$
  with p as (select nullif(pg_catalog.btrim(normalize(coalesce(p_q, ''), NFC)), '') as q)
  select * from (
    select e.id, e.title, e.event_date, e.event_time, e.link, e.notes, e.created_at, e.updated_at,
      case
        when p.q is null then 2
        when pg_catalog.strpos(pg_catalog.lower(e.title || ' ' || coalesce(e.notes, '')), pg_catalog.lower(p.q)) > 0 then 2
        when pg_catalog.strpos(e.search_folded, events_private.fold(p.q)) > 0 then 1
        else 0
      end as match_rank
    from public.events e cross join p
    where p_year is null
       or (e.event_date >= pg_catalog.make_date(p_year, 1, 1) and e.event_date < pg_catalog.make_date(p_year + 1, 1, 1))
  ) s where s.match_rank > 0
$$;

create function public.events_page(
  p_q text default null, p_year integer default null,
  p_after_rank integer default null, p_after_date date default null, p_after_has_time boolean default null,
  p_after_time time default null, p_after_created timestamptz default null, p_after_id uuid default null,
  p_limit integer default 50)
returns table (id uuid, title text, event_date date, event_time time, link text, notes text,
               created_at timestamptz, updated_at timestamptz, match_rank integer)
language sql stable security invoker set search_path = '' as $$
  select s.* from public.events_search(p_q, p_year) s
  where p_after_id is null
     or (s.match_rank, s.event_date, s.event_time is not null, coalesce(s.event_time, time '00:00'), s.created_at, s.id)
      < (p_after_rank, p_after_date, p_after_has_time, coalesce(p_after_time, time '00:00'), p_after_created, p_after_id)
  order by s.match_rank desc, s.event_date desc, (s.event_time is not null) desc,
           coalesce(s.event_time, time '00:00') desc, s.created_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 101)
$$;

create function public.events_counts(p_q text default null, p_year integer default null)
returns table (exact_count integer, accent_count integer)
language sql stable security invoker set search_path = '' as $$
  select (count(*) filter (where s.match_rank = 2))::integer,
         (count(*) filter (where s.match_rank = 1))::integer
  from public.events_search(p_q, p_year) s
$$;

create function public.events_years() returns setof integer
language sql stable security invoker set search_path = '' as $$
  select distinct pg_catalog.date_part('year', e.event_date)::integer from public.events e order by 1 desc
$$;

revoke all on function public.events_search(text, integer) from public, anon;
revoke all on function public.events_page(text, integer, integer, date, boolean, time, timestamptz, uuid, integer) from public, anon;
revoke all on function public.events_counts(text, integer) from public, anon;
revoke all on function public.events_years() from public, anon;
grant execute on function public.events_search(text, integer) to authenticated;
grant execute on function public.events_page(text, integer, integer, date, boolean, time, timestamptz, uuid, integer) to authenticated;
grant execute on function public.events_counts(text, integer) to authenticated;
grant execute on function public.events_years() to authenticated;
