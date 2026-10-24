-- Finisher Week tab (FIN-042 to FIN-048): weekly notes and bounded batch
-- due-date changes.
-- Requirements: requirements/finisher.md v6.2 (decisions 33–40, A29, A30).
-- Decisions: docs/architecture/decisions/ADR-0008-finisher-week-tab.md,
-- docs/architecture/finisher.md#week-tab-fin-042-to-fin-048. Writes stay in
-- SECURITY DEFINER functions (ADR-0002); users get SELECT on their own rows only.
--
-- A task's day on the board is its due date and its time is its due time, so
-- single moves and "Set time" reuse finisher_set_task_due unchanged.

-- ---------------------------------------------------------------------------
-- Weekly notes (FIN-047, decision 37)
-- ---------------------------------------------------------------------------

create table public.finisher_weekly_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The week's Monday (A2), a local date.
  week_start date not null check (extract(isodow from week_start) = 1),
  note text not null check (char_length(note) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.finisher_weekly_notes enable row level security;
revoke all on table public.finisher_weekly_notes from public, anon, authenticated;
grant select on table public.finisher_weekly_notes to authenticated;
create policy finisher_weekly_notes_select_own on public.finisher_weekly_notes
  for select to authenticated using (user_id = (select auth.uid()));

-- Saves the caller's note for a week; an empty note removes it. Weeks after
-- the current one have no review, so they can't have a note (FIN-042).
create function public.finisher_save_weekly_note(p_tz text, p_week_start date, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_today date := finisher_private.today(p_tz);
  v_this_week date := v_today - (extract(isodow from v_today)::int - 1);
  v_note text := finisher_private.clean_text(p_note, 'note', 2000, false);
begin
  if p_week_start is null or extract(isodow from p_week_start) <> 1
     or p_week_start < (v_this_week - interval '5 years')::date then
    raise exception 'week_start' using errcode = 'PH422';
  end if;
  if p_week_start > v_this_week then
    raise exception 'week_start' using errcode = 'PH409';
  end if;

  if v_note is null then
    delete from public.finisher_weekly_notes where user_id = v_uid and week_start = p_week_start;
  else
    insert into public.finisher_weekly_notes (user_id, week_start, note)
    values (v_uid, p_week_start, v_note)
    on conflict (user_id, week_start) do update
      set note = excluded.note, updated_at = now()
      where public.finisher_weekly_notes.user_id = v_uid;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Batch due-date changes (FIN-046 "Move all", FIN-047, Undo; A29)
-- ---------------------------------------------------------------------------

-- p_changes: [{"id": uuid, "dueDate": "YYYY-MM-DD" | null, "dueTime": "HH:MM" | null}],
-- 1 to 200 items. Each item goes through finisher_set_task_due, so ownership,
-- Open-only, the date range and the bottom-of-order rule are exactly those of
-- a single change. An item that is refused (not found, not Open, invalid) is
-- reported in "failed" and the others still apply. Returns
-- {"moved": [id…], "failed": [id…]} in input order.
create function public.finisher_set_tasks_due(p_tz text, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := finisher_private.require_uid();
  v_item jsonb;
  v_moved jsonb := '[]'::jsonb;
  v_failed jsonb := '[]'::jsonb;
begin
  perform finisher_private.today(p_tz);
  if p_changes is null or jsonb_typeof(p_changes) <> 'array'
     or jsonb_array_length(p_changes) = 0 or jsonb_array_length(p_changes) > 200 then
    raise exception 'changes' using errcode = 'PH422';
  end if;

  for v_item in select value from jsonb_array_elements(p_changes) loop
    begin
      if jsonb_typeof(v_item) <> 'object' then
        raise exception 'changes' using errcode = 'PH422';
      end if;
      perform public.finisher_set_task_due(
        p_tz,
        (v_item ->> 'id')::uuid,
        (v_item ->> 'dueDate')::date,
        (v_item ->> 'dueTime')::time
      );
      v_moved := v_moved || to_jsonb(v_item ->> 'id');
    exception
      when sqlstate 'PH404' or sqlstate 'PH409' or sqlstate 'PH422'
           or invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
        v_failed := v_failed || to_jsonb(coalesce(v_item ->> 'id', ''));
    end;
  end loop;
  return jsonb_build_object('moved', v_moved, 'failed', v_failed);
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
    'finisher_save_weekly_note(text, date, text)',
    'finisher_set_tasks_due(text, jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
