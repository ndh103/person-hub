-- Finisher Pomodoro sessions (FIN-039, FIN-040).
-- Requirements: requirements/finisher.md v5.0 (decisions 23–26, A18–A20).
-- Decisions: docs/architecture/decisions/ADR-0007-finisher-pomodoros.md,
-- docs/architecture/finisher.md#pomodoro-fin-039-fin-040. Writes go through
-- SECURITY DEFINER functions only (ADR-0002).
--
-- A session is 25 minutes. Its state follows from the database clock, so no
-- job or automation is needed:
--   running   = stopped_at is null and now() <  ends_at
--   completed = stopped_at is null and now() >= ends_at
--   abandoned = stopped_at is not null (Stop, Switch, or the task was deleted)

-- Lets child rows tie themselves to the task's owner with a composite foreign key
-- (as finisher_projects already allows).
alter table public.finisher_tasks add constraint finisher_tasks_id_user unique (id, user_id);

create table public.finisher_pomodoros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes smallint not null default 25 check (duration_minutes = 25),
  stopped_at timestamptz,
  -- Same owner as the task; deleting the task keeps completed sessions counted (A19).
  foreign key (task_id, user_id) references public.finisher_tasks (id, user_id) on delete set null (task_id),
  check (ends_at = started_at + make_interval(mins => duration_minutes)),
  check (stopped_at is null or stopped_at >= started_at)
);
create index finisher_pomodoros_user_ends on public.finisher_pomodoros (user_id, ends_at);
create index finisher_pomodoros_task on public.finisher_pomodoros (task_id) where task_id is not null;

alter table public.finisher_pomodoros enable row level security;
revoke all on table public.finisher_pomodoros from public, anon, authenticated;
grant select on table public.finisher_pomodoros to authenticated;
create policy finisher_pomodoros_select_own on public.finisher_pomodoros
  for select to authenticated using (user_id = (select auth.uid()));

-- Serialises one user's Pomodoro writes, so two quick Starts can't run two sessions.
create function finisher_private.lock_pomodoro(p_uid uuid) returns void
language plpgsql set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('finisher_pomodoro:' || p_uid::text, 0));
end
$$;
revoke all on function finisher_private.lock_pomodoro(uuid) from public, anon, authenticated;

-- FIN-039: start a 25-minute session on the caller's own Open task (A18). One
-- runs at a time; p_replace stops the running one first (Switch, not counted).
create function public.finisher_start_pomodoro(p_task_id uuid, p_replace boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_status text;
  v_running uuid;
  v_id uuid;
begin
  perform finisher_private.lock_pomodoro(v_uid);
  select status into v_status from public.finisher_tasks where id = p_task_id and user_id = v_uid;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_status <> 'open' then raise exception 'status' using errcode = 'PH409'; end if;

  select id into v_running from public.finisher_pomodoros
   where user_id = v_uid and stopped_at is null and ends_at > now()
   order by started_at desc limit 1;
  if v_running is not null then
    if not coalesce(p_replace, false) then
      raise exception 'pomodoro_running' using errcode = 'PH409';
    end if;
    update public.finisher_pomodoros set stopped_at = now() where id = v_running and user_id = v_uid;
  end if;

  insert into public.finisher_pomodoros (user_id, task_id, started_at, ends_at)
  values (v_uid, p_task_id, now(), now() + interval '25 minutes')
  returning id into v_id;
  return v_id;
end
$$;

-- FIN-039: stop (abandon) the caller's running session. Not counted.
create function public.finisher_stop_pomodoro(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_row public.finisher_pomodoros;
begin
  perform finisher_private.lock_pomodoro(v_uid);
  select * into v_row from public.finisher_pomodoros where id = p_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_row.stopped_at is not null or v_row.ends_at <= now() then
    raise exception 'not_running' using errcode = 'PH409';
  end if;
  update public.finisher_pomodoros set stopped_at = now() where id = p_id and user_id = v_uid;
end
$$;

-- Deleting a task abandons its running session (it would otherwise count for
-- nothing); completed sessions stay, unlinked (A19).
create or replace function public.finisher_delete_task(p_task_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
begin
  update public.finisher_pomodoros set stopped_at = now()
   where task_id = p_task_id and user_id = v_uid and stopped_at is null and ends_at > now();
  delete from public.finisher_tasks where id = p_task_id and user_id = v_uid;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
end
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'finisher_start_pomodoro(uuid, boolean)',
    'finisher_stop_pomodoro(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
