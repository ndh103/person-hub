-- Finisher: delegate a task (FIN-041).
-- Requirements: requirements/finisher.md v5.1 (FIN-041, decisions 29–31).
-- Decisions: docs/architecture/finisher.md#delegated-tasks-fin-041. Writes stay
-- in SECURITY DEFINER functions (ADR-0002); no policy or grant changes.
--
-- Delegated is a closed task status, next to Done and Let go. close_note holds
-- who the task was handed to, as it holds the reason for Let go; the status
-- decides how it is labelled.

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------

-- The original checks were unnamed, so drop them by definition and re-add them
-- with names.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.finisher_tasks'::regclass and contype = 'c'
       and (pg_get_constraintdef(oid) like '%status%''let_go''%'
            or pg_get_constraintdef(oid) like '%close_note IS NOT NULL%')
  loop
    execute format('alter table public.finisher_tasks drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.finisher_tasks
  add constraint finisher_tasks_status_check
    check (status in ('open', 'parked', 'done', 'let_go', 'delegated')),
  add constraint finisher_tasks_closed_check
    check ((status in ('done', 'let_go', 'delegated')) = (closed_at is not null)),
  add constraint finisher_tasks_note_check
    check ((status in ('let_go', 'delegated')) = (close_note is not null));

-- ---------------------------------------------------------------------------
-- Task lifecycle
-- ---------------------------------------------------------------------------

-- p_action: done | park | unpark | let_go | delegate | reopen. For delegate,
-- p_reason carries who the task was handed to (1–100 characters). Same
-- signature as before, so the existing grant stays.
create or replace function public.finisher_task_action(
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
  elsif p_action = 'delegate' and v_status in ('open', 'parked') then
    update public.finisher_tasks set
      status = 'delegated', revisit_date = null, closed_at = now(), updated_at = now(),
      close_note = finisher_private.clean_text(p_reason, 'delegated_to', 100, true)
     where id = p_task_id and user_id = v_uid;
    return 'delegated';
  elsif p_action = 'reopen' and v_status in ('done', 'let_go', 'delegated') then
    update public.finisher_tasks set
      status = 'open', closed_at = null, close_note = null, updated_at = now(),
      sort_key = case when coalesce(p_keep_position, false) then sort_key else finisher_private.bottom_key(v_uid) end
     where id = p_task_id and user_id = v_uid;
    return 'open';
  elsif p_action in ('done', 'park', 'unpark', 'let_go', 'delegate', 'reopen') then
    raise exception 'status' using errcode = 'PH409';
  end if;
  raise exception 'action' using errcode = 'PH422';
end
$$;
