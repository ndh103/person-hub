-- Finisher v4: one user-defined order for tasks (FIN-038) and the quick
-- due-date change (FIN-037).
-- Requirements: requirements/finisher.md v4.1 (FIN-021, FIN-037, FIN-038, A16).
-- Decisions: docs/architecture/decisions/ADR-0005-finisher-task-order-keys.md,
-- docs/architecture/finisher.md. Writes stay in SECURITY DEFINER functions
-- (ADR-0002): users still have SELECT only, so sort_key can't be set directly.
--
-- Order model: every task has a numeric sort_key, unique per user; lower comes
-- first. A move names the open tasks it lands between, and the database picks
-- an exact midpoint ((a + b) * 0.5 never rounds in numeric). Tasks go to the
-- bottom (floor(max) + 1) when created, unparked, reopened (unless it is the
-- immediate Undo of Mark done) or when their due date changes.

-- ---------------------------------------------------------------------------
-- Column, seed (A16) and constraints
-- ---------------------------------------------------------------------------

alter table public.finisher_tasks add column sort_key numeric;

-- Reproduce what each section showed before v4: dated open tasks by due date
-- and time (nulls last), then open tasks without a date newest first, then
-- everything else (those keys only matter for Undo after Mark done).
with ranked as (
  select id, row_number() over (
           partition by user_id
           order by
             (status <> 'open'),
             (due_date is null),
             due_date,
             due_time nulls last,
             case when due_date is null and status = 'open' then created_at end desc nulls last,
             created_at,
             id
         ) as n
    from public.finisher_tasks
)
update public.finisher_tasks t set sort_key = r.n from ranked r where r.id = t.id;

alter table public.finisher_tasks alter column sort_key set not null;
-- Deferrable so a rebalance can renumber every row in one statement.
alter table public.finisher_tasks
  add constraint finisher_tasks_user_sort_key unique (user_id, sort_key) deferrable initially deferred;
create index finisher_tasks_user_status_order on public.finisher_tasks (user_id, status, sort_key, id);

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

-- Serialises one user's order writes, so two requests can't pick the same key.
create function finisher_private.lock_task_order(p_uid uuid) returns void
language plpgsql set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('finisher_task_order:' || p_uid::text, 0));
end
$$;

-- The key that puts a task below all of the caller's tasks.
create function finisher_private.bottom_key(p_uid uuid) returns numeric
language plpgsql set search_path = '' as $$
begin
  perform finisher_private.lock_task_order(p_uid);
  return coalesce((select pg_catalog.floor(max(sort_key)) from public.finisher_tasks where user_id = p_uid), 0) + 1;
end
$$;

-- Renumbers the caller's tasks 1..n, keeping their order (keys stay short).
create function finisher_private.rebalance_task_order(p_uid uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update public.finisher_tasks t
     set sort_key = r.n
    from (select id, row_number() over (order by sort_key, id) as n
            from public.finisher_tasks where user_id = p_uid) r
   where t.id = r.id and t.user_id = p_uid;
end
$$;

revoke all on function finisher_private.lock_task_order(uuid) from public, anon, authenticated;
revoke all on function finisher_private.bottom_key(uuid) from public, anon, authenticated;
revoke all on function finisher_private.rebalance_task_order(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Changed task functions
-- ---------------------------------------------------------------------------

-- New tasks go to the bottom (FIN-038).
create or replace function public.finisher_create_task(
  p_tz text, p_title text, p_notes text default null,
  p_due_date date default null, p_due_time time default null, p_project_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_id uuid;
begin
  perform finisher_private.check_task_fields(v_uid, v_today, p_due_date, p_due_time, p_project_id, null);
  insert into public.finisher_tasks (user_id, project_id, title, notes, due_date, due_time, sort_key)
  values (
    v_uid, p_project_id,
    finisher_private.clean_text(p_title, 'title', 120, true),
    finisher_private.clean_text(p_notes, 'notes', 1000, false),
    p_due_date, p_due_time,
    finisher_private.bottom_key(v_uid)
  ) returning id into v_id;
  return v_id;
end
$$;

-- A changed due date moves the task to the bottom; other edits keep its place.
create or replace function public.finisher_update_task(
  p_tz text, p_task_id uuid, p_title text, p_notes text,
  p_due_date date, p_due_time time, p_project_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_task public.finisher_tasks;
  v_key numeric;
begin
  select * into v_task from public.finisher_tasks where id = p_task_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_task.status not in ('open', 'parked') then raise exception 'status' using errcode = 'PH409'; end if;
  perform finisher_private.check_task_fields(v_uid, v_today, p_due_date, p_due_time, p_project_id, v_task.project_id);
  v_key := case when p_due_date is distinct from v_task.due_date
                then finisher_private.bottom_key(v_uid) else v_task.sort_key end;
  update public.finisher_tasks set
    title = finisher_private.clean_text(p_title, 'title', 120, true),
    notes = finisher_private.clean_text(p_notes, 'notes', 1000, false),
    due_date = p_due_date,
    due_time = p_due_time,
    project_id = p_project_id,
    sort_key = v_key,
    updated_at = now()
  where id = p_task_id and user_id = v_uid;
end
$$;

-- p_action: done | park | unpark | let_go | reopen (task lifecycle table).
-- Unpark and reopen go to the bottom; p_keep_position keeps the place for the
-- immediate Undo after Mark done (FIN-021, FIN-038). The signature changes, so
-- the old function is dropped and the grant below is renewed.
drop function public.finisher_task_action(text, uuid, text, date, text);

create function public.finisher_task_action(
  p_tz text, p_task_id uuid, p_action text, p_revisit_date date default null, p_reason text default null,
  p_keep_position boolean default false
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
    update public.finisher_tasks set
      status = 'open', revisit_date = null, sort_key = finisher_private.bottom_key(v_uid), updated_at = now()
     where id = p_task_id and user_id = v_uid;
    return 'open';
  elsif p_action = 'let_go' and v_status in ('open', 'parked') then
    update public.finisher_tasks set
      status = 'let_go', revisit_date = null, closed_at = now(), updated_at = now(),
      close_note = finisher_private.clean_text(p_reason, 'reason', 500, true)
     where id = p_task_id and user_id = v_uid;
    return 'let_go';
  elsif p_action = 'reopen' and v_status in ('done', 'let_go') then
    update public.finisher_tasks set
      status = 'open', closed_at = null, close_note = null, updated_at = now(),
      sort_key = case when coalesce(p_keep_position, false) then sort_key else finisher_private.bottom_key(v_uid) end
     where id = p_task_id and user_id = v_uid;
    return 'open';
  elsif p_action in ('done', 'park', 'unpark', 'let_go', 'reopen') then
    raise exception 'status' using errcode = 'PH409';
  end if;
  raise exception 'action' using errcode = 'PH422';
end
$$;

-- ---------------------------------------------------------------------------
-- New functions
-- ---------------------------------------------------------------------------

-- FIN-037: set only the due date and time of an Open task. Same field rules as
-- editing; a changed date moves the task to the bottom. Repeating the same
-- values changes nothing.
create function public.finisher_set_task_due(
  p_tz text, p_task_id uuid, p_due_date date, p_due_time time
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_task public.finisher_tasks;
  v_key numeric;
begin
  select * into v_task from public.finisher_tasks where id = p_task_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_task.status <> 'open' then raise exception 'status' using errcode = 'PH409'; end if;
  perform finisher_private.check_task_fields(v_uid, v_today, p_due_date, p_due_time, v_task.project_id, v_task.project_id);
  if p_due_date is not distinct from v_task.due_date and p_due_time is not distinct from v_task.due_time then
    return;
  end if;
  v_key := case when p_due_date is distinct from v_task.due_date
                then finisher_private.bottom_key(v_uid) else v_task.sort_key end;
  update public.finisher_tasks set due_date = p_due_date, due_time = p_due_time, sort_key = v_key, updated_at = now()
   where id = p_task_id and user_id = v_uid;
end
$$;

-- FIN-038: move an Open task so it sits directly after p_after_id and directly
-- before p_before_id, as the caller's screen shows them (either may be null,
-- not both). Neighbours must be the caller's own Open tasks. The new key lies
-- between the two closest existing keys of any status inside those bounds, so
-- it never collides with a parked or closed task. A stale view (neighbours no
-- longer in order) is refused with PH409; the client then refetches.
create function public.finisher_move_task(p_task_id uuid, p_after_id uuid, p_before_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_status text;
  v_after numeric;
  v_before numeric;
  v_lower numeric;
  v_upper numeric;
  v_key numeric;
begin
  if (p_after_id is null and p_before_id is null)
     or p_task_id = p_after_id or p_task_id = p_before_id or p_after_id = p_before_id then
    raise exception 'position' using errcode = 'PH422';
  end if;
  perform finisher_private.lock_task_order(v_uid);

  select status into v_status from public.finisher_tasks where id = p_task_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
  if v_status <> 'open' then raise exception 'status' using errcode = 'PH409'; end if;

  if p_after_id is not null then
    select sort_key, status into v_after, v_status from public.finisher_tasks where id = p_after_id and user_id = v_uid;
    if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
    if v_status <> 'open' then raise exception 'status' using errcode = 'PH409'; end if;
  end if;
  if p_before_id is not null then
    select sort_key, status into v_before, v_status from public.finisher_tasks where id = p_before_id and user_id = v_uid;
    if not found then raise exception 'not_found' using errcode = 'PH404'; end if;
    if v_status <> 'open' then raise exception 'status' using errcode = 'PH409'; end if;
  end if;
  if v_after is not null and v_before is not null and v_after >= v_before then
    raise exception 'order_changed' using errcode = 'PH409';
  end if;

  -- The gap between two adjacent keys (any status, ignoring the moving task).
  v_lower := coalesce(v_after, (select max(sort_key) from public.finisher_tasks
                                 where user_id = v_uid and id <> p_task_id and sort_key < v_before));
  v_upper := (select min(sort_key) from public.finisher_tasks
               where user_id = v_uid and id <> p_task_id and (v_lower is null or sort_key > v_lower));

  v_key := case
    when v_lower is null then pg_catalog.ceil(v_upper) - 1
    when v_upper is null then pg_catalog.floor(v_lower) + 1
    else (v_lower + v_upper) * 0.5
  end;
  update public.finisher_tasks set sort_key = v_key where id = p_task_id and user_id = v_uid;

  if pg_catalog.scale(v_key) > 20 then
    perform finisher_private.rebalance_task_order(v_uid);
  end if;
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
    'finisher_task_action(text, uuid, text, date, text, boolean)',
    'finisher_set_task_due(text, uuid, date, time)',
    'finisher_move_task(uuid, uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
