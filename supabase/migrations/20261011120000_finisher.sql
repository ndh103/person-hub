-- Finisher: tasks, projects, weekly slots and session marks.
-- Requirements: requirements/finisher.md (FIN-001 to FIN-033).
-- Decisions: docs/architecture/decisions/ADR-0002-finisher-rpc-writes.md.
--
-- Access model
--   * Signed-in users may only SELECT their own rows (RLS, owner policies).
--   * No role gets INSERT/UPDATE/DELETE on these tables. Every write goes
--     through the SECURITY DEFINER functions below, which derive the owner
--     from auth.uid(), filter every statement by it, and enforce lifecycle
--     rules, the marking window and the session schedule. This keeps the
--     rules intact for direct Supabase API calls too (FIN-017).
--   * Local dates come from the caller's IANA timezone (p_tz, assumption A1).
--     A caller can shift "today" by choosing another zone; that is accepted
--     because it only affects the caller's own data.
--
-- Custom error codes (SQLSTATE) mapped by the app's service layer:
--   28000 unauthenticated · PH404 not found · PH409 action not allowed in the
--   current status · PH422 invalid value (message = field name).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.finisher_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  goal text check (goal is null or char_length(goal) between 1 and 500),
  done_when text not null check (char_length(done_when) between 1 and 300),
  target_date date,
  status text not null default 'active' check (status in ('active', 'parked', 'finished', 'let_go')),
  revisit_date date,
  -- Finish reflection (optional) or Let go reason (required).
  close_note text check (close_note is null or char_length(close_note) between 1 and 1000),
  started_on date not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check ((status = 'parked') = (revisit_date is not null)),
  check ((status in ('finished', 'let_go')) = (closed_at is not null)),
  check (status <> 'let_go' or close_note is not null),
  check (status in ('finished', 'let_go') or close_note is null)
);

-- Dates on which the project was Active: [start_on, end_on), end_on null = still active.
create table public.finisher_project_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  start_on date not null,
  end_on date,
  foreign key (project_id, user_id) references public.finisher_projects (id, user_id) on delete cascade,
  check (end_on is null or end_on > start_on)
);
create unique index finisher_project_periods_one_open on public.finisher_project_periods (project_id) where end_on is null;
create index finisher_project_periods_project on public.finisher_project_periods (project_id, start_on);

create table public.finisher_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  created_on date not null,
  removed_on date,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.finisher_projects (id, user_id) on delete cascade
);
create index finisher_slots_project on public.finisher_slots (project_id);

-- Slot settings in effect on [valid_from, valid_to). Edits apply from today (FIN-025).
create table public.finisher_slot_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slot_id uuid not null,
  valid_from date not null,
  valid_to date,
  activity text not null check (char_length(activity) between 1 and 80),
  -- ISO weekdays: 1 = Monday … 7 = Sunday.
  days smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  duration_minutes smallint not null check (duration_minutes between 5 and 480),
  start_time time,
  foreign key (slot_id, user_id) references public.finisher_slots (id, user_id) on delete cascade,
  check (valid_to is null or valid_to > valid_from)
);
create unique index finisher_slot_versions_one_open on public.finisher_slot_versions (slot_id) where valid_to is null;
create index finisher_slot_versions_slot on public.finisher_slot_versions (slot_id, valid_from);

-- A marked session. Unmarked = no row. One row per slot per local date (FIN-026).
create table public.finisher_session_marks (
  user_id uuid not null,
  slot_id uuid not null,
  session_date date not null,
  state text not null check (state in ('done', 'skipped')),
  marked_at timestamptz not null default now(),
  primary key (slot_id, session_date),
  foreign key (slot_id, user_id) references public.finisher_slots (id, user_id) on delete cascade
);
create index finisher_session_marks_user_date on public.finisher_session_marks (user_id, session_date);

create table public.finisher_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(title) between 1 and 120),
  notes text check (notes is null or char_length(notes) between 1 and 1000),
  due_date date,
  due_time time,
  status text not null default 'open' check (status in ('open', 'parked', 'done', 'let_go')),
  revisit_date date,
  -- Let go reason.
  close_note text check (close_note is null or char_length(close_note) between 1 and 500),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A task can only link to a project of the same owner. Deleting the project
  -- keeps the task and clears only the link (assumption A5).
  foreign key (project_id, user_id) references public.finisher_projects (id, user_id) on delete set null (project_id),
  check (due_time is null or due_date is not null),
  check ((status = 'parked') = (revisit_date is not null)),
  check ((status in ('done', 'let_go')) = (closed_at is not null)),
  check ((status = 'let_go') = (close_note is not null))
);
create index finisher_tasks_user_status_due on public.finisher_tasks (user_id, status, due_date, due_time);
create index finisher_tasks_user_closed on public.finisher_tasks (user_id, closed_at desc) where closed_at is not null;
create index finisher_tasks_project on public.finisher_tasks (project_id) where project_id is not null;
create index finisher_projects_user_status on public.finisher_projects (user_id, status);
create index finisher_projects_user_closed on public.finisher_projects (user_id, closed_at desc) where closed_at is not null;

-- ---------------------------------------------------------------------------
-- Grants and RLS: read own rows only; no direct writes
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'finisher_projects', 'finisher_project_periods', 'finisher_slots',
    'finisher_slot_versions', 'finisher_session_marks', 'finisher_tasks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable through the API)
-- ---------------------------------------------------------------------------

create schema if not exists finisher_private;
revoke all on schema finisher_private from public, anon, authenticated;

create function finisher_private.require_uid() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  return v_uid;
end
$$;

create function finisher_private.today(p_tz text) returns date
language plpgsql stable set search_path = '' as $$
begin
  if p_tz is null or char_length(p_tz) > 64
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then
    raise exception 'timezone' using errcode = 'PH422';
  end if;
  return (now() at time zone p_tz)::date;
end
$$;

create function finisher_private.clean_text(p_value text, p_field text, p_max int, p_required boolean)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v text := nullif(btrim(coalesce(p_value, '')), '');
begin
  if v is null then
    if p_required then
      raise exception '%', p_field using errcode = 'PH422';
    end if;
    return null;
  end if;
  if char_length(v) > p_max then
    raise exception '%', p_field using errcode = 'PH422';
  end if;
  return v;
end
$$;

create function finisher_private.check_days(p_days smallint[]) returns smallint[]
language plpgsql immutable set search_path = '' as $$
declare
  v smallint[];
begin
  select array_agg(distinct d order by d) into v from unnest(p_days) as d;
  if v is null or cardinality(v) = 0 or not (v <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]) then
    raise exception 'days' using errcode = 'PH422';
  end if;
  return v;
end
$$;

-- Closes the project's open active period at p_today (exclusive).
create function finisher_private.close_period(p_uid uuid, p_project uuid, p_today date) returns void
language sql set search_path = '' as $$
  delete from public.finisher_project_periods
   where user_id = p_uid and project_id = p_project and end_on is null and start_on >= p_today;
  update public.finisher_project_periods set end_on = p_today
   where user_id = p_uid and project_id = p_project and end_on is null;
$$;

-- Opens an active period from p_today, joining a period that ended today.
create function finisher_private.open_period(p_uid uuid, p_project uuid, p_today date) returns void
language plpgsql set search_path = '' as $$
begin
  update public.finisher_project_periods set end_on = null
   where user_id = p_uid and project_id = p_project and end_on = p_today;
  if not found then
    insert into public.finisher_project_periods (user_id, project_id, start_on)
    values (p_uid, p_project, p_today);
  end if;
end
$$;

create function finisher_private.insert_slot(
  p_uid uuid, p_project uuid, p_today date,
  p_activity text, p_days smallint[], p_duration int, p_start_time time
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_slot uuid;
  v_activity text := finisher_private.clean_text(p_activity, 'activity', 80, true);
begin
  if p_duration is null or p_duration < 5 or p_duration > 480 then
    raise exception 'duration' using errcode = 'PH422';
  end if;
  if (select count(*) from public.finisher_slots
       where user_id = p_uid and project_id = p_project and removed_on is null) >= 20 then
    raise exception 'slots' using errcode = 'PH422';
  end if;
  insert into public.finisher_slots (user_id, project_id, created_on)
  values (p_uid, p_project, p_today) returning id into v_slot;
  insert into public.finisher_slot_versions (user_id, slot_id, valid_from, activity, days, duration_minutes, start_time)
  values (p_uid, v_slot, p_today, v_activity, finisher_private.check_days(p_days), p_duration, p_start_time);
  return v_slot;
end
$$;

-- FIN-026: a session exists for (slot, date) when a slot version covering the
-- date includes its weekday and the project was Active on that date.
create function finisher_private.is_scheduled(p_uid uuid, p_slot uuid, p_date date) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1
      from public.finisher_slots s
      join public.finisher_slot_versions v on v.slot_id = s.id and v.user_id = p_uid
      join public.finisher_project_periods p on p.project_id = s.project_id and p.user_id = p_uid
     where s.id = p_slot and s.user_id = p_uid
       and v.valid_from <= p_date and (v.valid_to is null or p_date < v.valid_to)
       and extract(isodow from p_date)::smallint = any (v.days)
       and p.start_on <= p_date and (p.end_on is null or p_date < p.end_on)
  )
$$;

revoke all on all functions in schema finisher_private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create function finisher_private.check_task_fields(
  p_uid uuid, p_today date, p_due_date date, p_due_time time, p_project uuid, p_current_project uuid
) returns void language plpgsql stable set search_path = '' as $$
begin
  if p_due_time is not null and p_due_date is null then
    raise exception 'due_time' using errcode = 'PH422';
  end if;
  if p_due_date is not null
     and (p_due_date < (p_today - interval '5 years')::date or p_due_date > (p_today + interval '5 years')::date) then
    raise exception 'due_date' using errcode = 'PH422';
  end if;
  -- A new link must point to the caller's own Active or Parked project. An
  -- existing link may stay when the project has since closed (assumption A4).
  if p_project is not null and p_project is distinct from p_current_project
     and not exists (select 1 from public.finisher_projects
                      where id = p_project and user_id = p_uid and status in ('active', 'parked')) then
    raise exception 'project' using errcode = 'PH422';
  end if;
end
$$;
revoke all on function finisher_private.check_task_fields from public, anon, authenticated;

create function public.finisher_create_task(
  p_tz text, p_title text, p_notes text default null,
  p_due_date date default null, p_due_time time default null, p_project_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_id uuid;
begin
  perform finisher_private.check_task_fields(v_uid, v_today, p_due_date, p_due_time, p_project_id, null);
  insert into public.finisher_tasks (user_id, project_id, title, notes, due_date, due_time)
  values (
    v_uid, p_project_id,
    finisher_private.clean_text(p_title, 'title', 120, true),
    finisher_private.clean_text(p_notes, 'notes', 1000, false),
    p_due_date, p_due_time
  ) returning id into v_id;
  return v_id;
end
$$;

create function public.finisher_update_task(
  p_tz text, p_task_id uuid, p_title text, p_notes text,
  p_due_date date, p_due_time time, p_project_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_task public.finisher_tasks;
begin
  select * into v_task from public.finisher_tasks where id = p_task_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_task.status not in ('open', 'parked') then raise exception 'status' using errcode = 'PH409'; end if;
  perform finisher_private.check_task_fields(v_uid, v_today, p_due_date, p_due_time, p_project_id, v_task.project_id);
  update public.finisher_tasks set
    title = finisher_private.clean_text(p_title, 'title', 120, true),
    notes = finisher_private.clean_text(p_notes, 'notes', 1000, false),
    due_date = p_due_date,
    due_time = p_due_time,
    project_id = p_project_id,
    updated_at = now()
  where id = p_task_id and user_id = v_uid;
end
$$;

-- p_action: done | park | unpark | let_go | reopen (task lifecycle table).
create function public.finisher_task_action(
  p_tz text, p_task_id uuid, p_action text, p_revisit_date date default null, p_reason text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_status text;
begin
  select status into v_status from public.finisher_tasks where id = p_task_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;

  if p_action = 'done' and v_status in ('open', 'parked') then
    update public.finisher_tasks set status = 'done', revisit_date = null, closed_at = now(), updated_at = now()
     where id = p_task_id and user_id = v_uid;
    return 'done';
  elsif p_action = 'park' and v_status in ('open', 'parked') then
    if p_revisit_date is null or p_revisit_date <= v_today or p_revisit_date > v_today + 365 then
      raise exception 'revisit_date' using errcode = 'PH422';
    end if;
    update public.finisher_tasks set status = 'parked', revisit_date = p_revisit_date, updated_at = now()
     where id = p_task_id and user_id = v_uid;
    return 'parked';
  elsif p_action = 'unpark' and v_status = 'parked' then
    update public.finisher_tasks set status = 'open', revisit_date = null, updated_at = now()
     where id = p_task_id and user_id = v_uid;
    return 'open';
  elsif p_action = 'let_go' and v_status in ('open', 'parked') then
    update public.finisher_tasks set
      status = 'let_go', revisit_date = null, closed_at = now(), updated_at = now(),
      close_note = finisher_private.clean_text(p_reason, 'reason', 500, true)
     where id = p_task_id and user_id = v_uid;
    return 'let_go';
  elsif p_action = 'reopen' and v_status in ('done', 'let_go') then
    update public.finisher_tasks set status = 'open', closed_at = null, close_note = null, updated_at = now()
     where id = p_task_id and user_id = v_uid;
    return 'open';
  elsif p_action in ('done', 'park', 'unpark', 'let_go', 'reopen') then
    raise exception 'status' using errcode = 'PH409';
  end if;
  raise exception 'action' using errcode = 'PH422';
end
$$;

create function public.finisher_delete_task(p_task_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
begin
  delete from public.finisher_tasks where id = p_task_id and user_id = v_uid;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

-- p_slots: [{"activity": text, "days": [1..7], "durationMinutes": int, "startTime": "HH:MM" | null}]
create function public.finisher_create_project(
  p_tz text, p_title text, p_goal text, p_done_when text,
  p_target_date date default null, p_slots jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_id uuid;
  v_slot jsonb;
begin
  if p_target_date is not null and p_target_date < v_today then
    raise exception 'target_date' using errcode = 'PH422';
  end if;
  if p_slots is null or jsonb_typeof(p_slots) <> 'array' then
    raise exception 'slots' using errcode = 'PH422';
  end if;
  if jsonb_array_length(p_slots) > 20 then
    raise exception 'slots' using errcode = 'PH422';
  end if;

  insert into public.finisher_projects (user_id, title, goal, done_when, target_date, started_on)
  values (
    v_uid,
    finisher_private.clean_text(p_title, 'title', 120, true),
    finisher_private.clean_text(p_goal, 'goal', 500, false),
    finisher_private.clean_text(p_done_when, 'done_when', 300, true),
    p_target_date, v_today
  ) returning id into v_id;
  insert into public.finisher_project_periods (user_id, project_id, start_on) values (v_uid, v_id, v_today);

  for v_slot in select value from jsonb_array_elements(p_slots) loop
    begin
      perform finisher_private.insert_slot(
        v_uid, v_id, v_today,
        v_slot ->> 'activity',
        (select array_agg(d::smallint) from jsonb_array_elements_text(v_slot -> 'days') as d),
        (v_slot ->> 'durationMinutes')::int,
        (v_slot ->> 'startTime')::time
      );
    exception
      when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
           or numeric_value_out_of_range or wrong_object_type or invalid_parameter_value then
        raise exception 'slots' using errcode = 'PH422';
    end;
  end loop;
  return v_id;
end
$$;

create function public.finisher_update_project(
  p_tz text, p_project_id uuid, p_title text, p_goal text, p_done_when text, p_target_date date
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_project public.finisher_projects;
begin
  select * into v_project from public.finisher_projects where id = p_project_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_project.status not in ('active', 'parked') then raise exception 'status' using errcode = 'PH409'; end if;
  -- "Today or later when set or changed": an unchanged past date may stay.
  if p_target_date is not null and p_target_date is distinct from v_project.target_date and p_target_date < v_today then
    raise exception 'target_date' using errcode = 'PH422';
  end if;
  update public.finisher_projects set
    title = finisher_private.clean_text(p_title, 'title', 120, true),
    goal = finisher_private.clean_text(p_goal, 'goal', 500, false),
    done_when = finisher_private.clean_text(p_done_when, 'done_when', 300, true),
    target_date = p_target_date,
    updated_at = now()
  where id = p_project_id and user_id = v_uid;
end
$$;

-- p_action: finish | park | unpark | let_go | reopen (project lifecycle table).
-- p_note: Finish reflection (optional) or Let go reason (required).
create function public.finisher_project_action(
  p_tz text, p_project_id uuid, p_action text, p_revisit_date date default null, p_note text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_status text;
begin
  select status into v_status from public.finisher_projects where id = p_project_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;

  if p_action = 'finish' and v_status in ('active', 'parked') then
    perform finisher_private.close_period(v_uid, p_project_id, v_today);
    update public.finisher_projects set
      status = 'finished', revisit_date = null, closed_at = now(), updated_at = now(),
      close_note = finisher_private.clean_text(p_note, 'reflection', 1000, false)
     where id = p_project_id and user_id = v_uid;
    return 'finished';
  elsif p_action = 'park' and v_status in ('active', 'parked') then
    if p_revisit_date is null or p_revisit_date <= v_today or p_revisit_date > v_today + 365 then
      raise exception 'revisit_date' using errcode = 'PH422';
    end if;
    perform finisher_private.close_period(v_uid, p_project_id, v_today);
    update public.finisher_projects set status = 'parked', revisit_date = p_revisit_date, updated_at = now()
     where id = p_project_id and user_id = v_uid;
    return 'parked';
  elsif p_action = 'unpark' and v_status = 'parked' then
    perform finisher_private.open_period(v_uid, p_project_id, v_today);
    update public.finisher_projects set status = 'active', revisit_date = null, updated_at = now()
     where id = p_project_id and user_id = v_uid;
    return 'active';
  elsif p_action = 'let_go' and v_status in ('active', 'parked') then
    perform finisher_private.close_period(v_uid, p_project_id, v_today);
    update public.finisher_projects set
      status = 'let_go', revisit_date = null, closed_at = now(), updated_at = now(),
      close_note = finisher_private.clean_text(p_note, 'reason', 500, true)
     where id = p_project_id and user_id = v_uid;
    return 'let_go';
  elsif p_action = 'reopen' and v_status in ('finished', 'let_go') then
    perform finisher_private.open_period(v_uid, p_project_id, v_today);
    update public.finisher_projects set status = 'active', closed_at = null, close_note = null, updated_at = now()
     where id = p_project_id and user_id = v_uid;
    return 'active';
  elsif p_action in ('finish', 'park', 'unpark', 'let_go', 'reopen') then
    raise exception 'status' using errcode = 'PH409';
  end if;
  raise exception 'action' using errcode = 'PH422';
end
$$;

-- Deletes the project, its periods, slots and session marks. Linked tasks stay, unlinked (A5).
create function public.finisher_delete_project(p_project_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
begin
  delete from public.finisher_projects where id = p_project_id and user_id = v_uid;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Slots (FIN-025): changes apply from today forward
-- ---------------------------------------------------------------------------

create function public.finisher_add_slot(
  p_tz text, p_project_id uuid, p_activity text, p_days smallint[], p_duration_minutes int, p_start_time time default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_status text;
begin
  -- Row lock serialises concurrent additions, so the 20-slot cap holds.
  select status into v_status from public.finisher_projects where id = p_project_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_status not in ('active', 'parked') then raise exception 'status' using errcode = 'PH409'; end if;
  return finisher_private.insert_slot(v_uid, p_project_id, v_today, p_activity, p_days, p_duration_minutes, p_start_time);
end
$$;

create function public.finisher_update_slot(
  p_tz text, p_slot_id uuid, p_activity text, p_days smallint[], p_duration_minutes int, p_start_time time default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_status text;
  v_version public.finisher_slot_versions;
  v_activity text := finisher_private.clean_text(p_activity, 'activity', 80, true);
  v_days smallint[] := finisher_private.check_days(p_days);
begin
  if p_duration_minutes is null or p_duration_minutes < 5 or p_duration_minutes > 480 then
    raise exception 'duration' using errcode = 'PH422';
  end if;
  select p.status into v_status
    from public.finisher_slots s join public.finisher_projects p on p.id = s.project_id and p.user_id = v_uid
   where s.id = p_slot_id and s.user_id = v_uid and s.removed_on is null
     for update of s;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_status not in ('active', 'parked') then raise exception 'status' using errcode = 'PH409'; end if;

  select * into v_version from public.finisher_slot_versions
   where slot_id = p_slot_id and user_id = v_uid and valid_to is null;

  if v_version.valid_from >= v_today then
    update public.finisher_slot_versions set
      activity = v_activity, days = v_days, duration_minutes = p_duration_minutes, start_time = p_start_time
     where id = v_version.id;
  else
    update public.finisher_slot_versions set valid_to = v_today where id = v_version.id;
    insert into public.finisher_slot_versions (user_id, slot_id, valid_from, activity, days, duration_minutes, start_time)
    values (v_uid, p_slot_id, v_today, v_activity, v_days, p_duration_minutes, p_start_time);
  end if;
end
$$;

-- Stops future sessions. Past session marks and rates are kept.
create function public.finisher_remove_slot(p_tz text, p_slot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_status text;
begin
  select p.status into v_status
    from public.finisher_slots s join public.finisher_projects p on p.id = s.project_id and p.user_id = v_uid
   where s.id = p_slot_id and s.user_id = v_uid and s.removed_on is null
     for update of s;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_status not in ('active', 'parked') then raise exception 'status' using errcode = 'PH409'; end if;

  -- A version that started today keeps today when today's session was already
  -- marked (FIN-025: a marked session from today is kept); otherwise it goes.
  update public.finisher_slot_versions set valid_to = v_today + 1
   where slot_id = p_slot_id and user_id = v_uid and valid_to is null and valid_from >= v_today
     and exists (select 1 from public.finisher_session_marks
                  where slot_id = p_slot_id and user_id = v_uid and session_date = v_today);
  delete from public.finisher_slot_versions
   where slot_id = p_slot_id and user_id = v_uid and valid_to is null and valid_from >= v_today;
  update public.finisher_slot_versions set valid_to = v_today
   where slot_id = p_slot_id and user_id = v_uid and valid_to is null;

  if not exists (select 1 from public.finisher_slot_versions where slot_id = p_slot_id and user_id = v_uid)
     and not exists (select 1 from public.finisher_session_marks where slot_id = p_slot_id and user_id = v_uid) then
    -- Added and removed on the same day with nothing recorded: nothing to keep.
    delete from public.finisher_slots where id = p_slot_id and user_id = v_uid;
  else
    update public.finisher_slots set removed_on = v_today where id = p_slot_id and user_id = v_uid;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Sessions (FIN-027): Done / Skipped / Unmarked within the marking window
-- ---------------------------------------------------------------------------

create function public.finisher_mark_session(p_tz text, p_slot_id uuid, p_date date, p_state text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
begin
  if p_state is null or p_state not in ('done', 'skipped', 'unmarked') then
    raise exception 'state' using errcode = 'PH422';
  end if;
  if not exists (select 1 from public.finisher_slots where id = p_slot_id and user_id = v_uid) then
    raise exception 'not_found' using errcode = 'PH404';
  end if;
  -- Marking window: today and the 7 previous local dates (assumption A3).
  if p_date is null or p_date > v_today or p_date < v_today - 7 then
    raise exception 'date' using errcode = 'PH409';
  end if;
  -- Only scheduled sessions can be marked. An existing record stays editable
  -- (for example today's mark after the slot's days changed).
  if not finisher_private.is_scheduled(v_uid, p_slot_id, p_date)
     and not exists (select 1 from public.finisher_session_marks
                      where slot_id = p_slot_id and user_id = v_uid and session_date = p_date) then
    raise exception 'date' using errcode = 'PH409';
  end if;

  if p_state = 'unmarked' then
    delete from public.finisher_session_marks where slot_id = p_slot_id and user_id = v_uid and session_date = p_date;
  else
    insert into public.finisher_session_marks (user_id, slot_id, session_date, state)
    values (v_uid, p_slot_id, p_date, p_state)
    on conflict (slot_id, session_date) do update
      set state = excluded.state,
          marked_at = case when public.finisher_session_marks.state = excluded.state
                           then public.finisher_session_marks.marked_at else now() end
      where public.finisher_session_marks.user_id = v_uid;
  end if;
  return p_state;
end
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: signed-in users only
-- ---------------------------------------------------------------------------

do $$
declare
  f text;
begin
  foreach f in array array[
    'finisher_create_task(text, text, text, date, time, uuid)',
    'finisher_update_task(text, uuid, text, text, date, time, uuid)',
    'finisher_task_action(text, uuid, text, date, text)',
    'finisher_delete_task(uuid)',
    'finisher_create_project(text, text, text, text, date, jsonb)',
    'finisher_update_project(text, uuid, text, text, text, date)',
    'finisher_project_action(text, uuid, text, date, text)',
    'finisher_delete_project(uuid)',
    'finisher_add_slot(text, uuid, text, smallint[], int, time)',
    'finisher_update_slot(text, uuid, text, smallint[], int, time)',
    'finisher_remove_slot(text, uuid)',
    'finisher_mark_session(text, uuid, date, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
