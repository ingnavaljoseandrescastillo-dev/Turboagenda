-- ============================================================
-- TurboAgenda - Fix get_available_slots RPC ambiguity
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

drop function if exists public.get_available_slots(uuid, uuid, uuid, date, text);

create or replace function public.get_available_slots(
  p_business_id  uuid,
  p_service_id   uuid,
  p_employee_id  uuid,
  p_date         date
)
returns text[]
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_opening       time;
  v_closing       time;
  v_slot_min      int;
  v_duration      int;
  v_working_days  int[];
  v_dow           int;
  v_current       time;
  v_end_time      time;
  v_slots         text[] := '{}';
  v_conflict      boolean;
begin
  select
    coalesce(bs.opening_time, '09:00'::time),
    coalesce(bs.closing_time, '18:00'::time),
    coalesce(bs.slot_duration_minutes, 30),
    coalesce(bs.working_days, '{1,2,3,4,5}'::int[])
  into v_opening, v_closing, v_slot_min, v_working_days
  from public.business_settings bs
  where bs.business_id = p_business_id;

  if not found then
    v_opening := '09:00'::time;
    v_closing := '18:00'::time;
    v_slot_min := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
  end if;

  v_dow := extract(dow from p_date)::int;
  if not (v_dow = any(v_working_days)) then
    return v_slots;
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and is_active = true;

  if not found then
    return v_slots;
  end if;

  v_current := v_opening;
  loop
    v_end_time := v_current + (v_duration || ' minutes')::interval;
    exit when v_end_time > v_closing;

    select exists (
      select 1
      from public.appointments
      where employee_id = p_employee_id
        and status not in ('cancelled')
        and start_time < (p_date + v_end_time)::timestamptz
        and end_time > (p_date + v_current)::timestamptz
    ) into v_conflict;

    if not v_conflict then
      v_slots := array_append(v_slots, to_char(v_current, 'HH24:MI'));
    end if;

    v_current := v_current + (v_slot_min || ' minutes')::interval;
  end loop;

  return v_slots;
end;
$$;

grant execute on function public.get_available_slots(uuid, uuid, uuid, date) to anon, authenticated;
