-- TurboAgenda - selectable booking months and split daily schedules
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.business_settings
  add column if not exists available_months text[] not null default '{}',
  add column if not exists working_schedule jsonb not null default '{}'::jsonb;

alter table public.business_day_overrides
  add column if not exists time_ranges jsonb not null default '[]'::jsonb;

update public.business_settings bs
set working_schedule = coalesce(
  (
    select jsonb_object_agg(
      day_value::text,
      jsonb_build_array(
        jsonb_build_object(
          'start', to_char(coalesce(bs.opening_time, '09:00'::time), 'HH24:MI'),
          'end', to_char(coalesce(bs.closing_time, '18:00'::time), 'HH24:MI')
        )
      )
    )
    from unnest(coalesce(bs.working_days, '{1,2,3,4,5}'::int[])) as day_value
  ),
  '{}'::jsonb
)
where bs.working_schedule = '{}'::jsonb;

update public.business_day_overrides
set time_ranges = jsonb_build_array(
  jsonb_build_object(
    'start', to_char(opening_time, 'HH24:MI'),
    'end', to_char(closing_time, 'HH24:MI')
  )
)
where is_closed = false
  and opening_time is not null
  and closing_time is not null
  and time_ranges = '[]'::jsonb;

create or replace function public.time_ranges_from_json(
  p_ranges jsonb,
  p_default_opening time default null,
  p_default_closing time default null
)
returns table(opening_time time, closing_time time)
language plpgsql
immutable
as $$
declare
  v_item jsonb;
  v_start time;
  v_end time;
  v_emitted boolean := false;
begin
  if jsonb_typeof(coalesce(p_ranges, '[]'::jsonb)) = 'array' then
    for v_item in select value from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb))
    loop
      begin
        v_start := (v_item ->> 'start')::time;
        v_end := (v_item ->> 'end')::time;
      exception when others then
        continue;
      end;

      if v_start is not null and v_end is not null and v_start < v_end then
        v_emitted := true;
        opening_time := v_start;
        closing_time := v_end;
        return next;
      end if;
    end loop;
  end if;

  if not v_emitted
    and p_default_opening is not null
    and p_default_closing is not null
    and p_default_opening < p_default_closing
  then
    opening_time := p_default_opening;
    closing_time := p_default_closing;
    return next;
  end if;
end;
$$;

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
  v_opening time;
  v_closing time;
  v_slot_min int;
  v_duration int;
  v_working_days int[];
  v_time_zone text;
  v_max_days int;
  v_available_months text[];
  v_working_schedule jsonb;
  v_dow int;
  v_dow_key text;
  v_current time;
  v_end_time time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_slots text[] := '{}';
  v_conflict boolean;
  v_override public.business_day_overrides%rowtype;
  v_ranges jsonb;
  v_range record;
begin
  select
    coalesce(bs.opening_time, '09:00'::time),
    coalesce(bs.closing_time, '18:00'::time),
    coalesce(bs.slot_duration_minutes, 30),
    coalesce(bs.working_days, '{1,2,3,4,5}'::int[]),
    coalesce(bs.time_zone, 'Europe/Lisbon'),
    coalesce(bs.max_booking_days, 30),
    coalesce(bs.available_months, '{}'::text[]),
    coalesce(bs.working_schedule, '{}'::jsonb)
  into v_opening, v_closing, v_slot_min, v_working_days, v_time_zone, v_max_days, v_available_months, v_working_schedule
  from public.business_settings bs
  where bs.business_id = p_business_id;

  if not found then
    v_opening := '09:00'::time;
    v_closing := '18:00'::time;
    v_slot_min := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
    v_time_zone := 'Europe/Lisbon';
    v_max_days := 30;
    v_available_months := '{}'::text[];
    v_working_schedule := '{}'::jsonb;
  end if;

  if p_date < current_date then
    return v_slots;
  end if;

  if cardinality(v_available_months) > 0 then
    if not (to_char(p_date, 'YYYY-MM') = any(v_available_months)) then
      return v_slots;
    end if;
  elsif p_date >= current_date + v_max_days then
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

  select * into v_override
  from public.business_day_overrides bdo
  where bdo.business_id = p_business_id
    and bdo.date = p_date;

  if found then
    if v_override.is_closed then
      return v_slots;
    end if;

    v_slot_min := coalesce(v_override.slot_duration_minutes, v_slot_min);
    v_ranges := coalesce(v_override.time_ranges, '[]'::jsonb);
  else
    v_dow := extract(dow from p_date)::int;
    if not (v_dow = any(v_working_days)) then
      return v_slots;
    end if;

    v_dow_key := v_dow::text;
    v_ranges := coalesce(v_working_schedule -> v_dow_key, '[]'::jsonb);
  end if;

  for v_range in
    select * from public.time_ranges_from_json(v_ranges, v_opening, v_closing)
  loop
    v_current := v_range.opening_time;
    loop
      v_end_time := v_current + (v_duration || ' minutes')::interval;
      exit when v_end_time > v_range.closing_time;

      v_slot_start := (p_date + v_current) at time zone v_time_zone;
      v_slot_end := (p_date + v_end_time) at time zone v_time_zone;

      select exists (
        select 1
        from public.appointments
        where employee_id = p_employee_id
          and status not in ('cancelled')
          and start_time < v_slot_end
          and end_time > v_slot_start
      ) into v_conflict;

      if not v_conflict then
        v_slots := array_append(v_slots, to_char(v_current, 'HH24:MI'));
      end if;

      v_current := v_current + (v_slot_min || ' minutes')::interval;
    end loop;
  end loop;

  return array(select distinct unnest(v_slots) order by 1);
end;
$$;

grant execute on function public.get_available_slots(uuid, uuid, uuid, date) to anon, authenticated;

create or replace function public.create_public_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_employee_id uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_client_birthdate date,
  p_start_time timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_end_time timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_appt_id uuid;
  v_client_id uuid;
  v_conflict boolean;
  v_max_days int;
  v_opening time;
  v_closing time;
  v_slot_min int;
  v_working_days int[];
  v_time_zone text;
  v_available_months text[];
  v_working_schedule jsonb;
  v_dow int;
  v_dow_key text;
  v_override public.business_day_overrides%rowtype;
  v_ranges jsonb;
  v_is_inside_range boolean := false;
begin
  select
    coalesce(max_booking_days, 30),
    coalesce(opening_time, '09:00'::time),
    coalesce(closing_time, '18:00'::time),
    coalesce(slot_duration_minutes, 30),
    coalesce(working_days, '{1,2,3,4,5}'::int[]),
    coalesce(time_zone, 'Europe/Lisbon'),
    coalesce(available_months, '{}'::text[]),
    coalesce(working_schedule, '{}'::jsonb)
  into v_max_days, v_opening, v_closing, v_slot_min, v_working_days, v_time_zone, v_available_months, v_working_schedule
  from public.business_settings
  where business_id = p_business_id;

  if not found then
    v_max_days := 30;
    v_opening := '09:00'::time;
    v_closing := '18:00'::time;
    v_slot_min := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
    v_time_zone := 'Europe/Lisbon';
    v_available_months := '{}'::text[];
    v_working_schedule := '{}'::jsonb;
  end if;

  v_local_start := p_start_time at time zone v_time_zone;

  if v_local_start::date < current_date then
    raise exception 'Nao e possivel reservar datas passadas';
  end if;

  if cardinality(v_available_months) > 0 then
    if not (to_char(v_local_start::date, 'YYYY-MM') = any(v_available_months)) then
      raise exception 'Este mes no esta disponible para reservas';
    end if;
  elsif v_local_start::date >= current_date + v_max_days then
    raise exception 'Reservas disponiveis apenas nos proximos % dias', v_max_days;
  end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and is_active = true;

  if not found then
    raise exception 'Servico nao encontrado ou inativo';
  end if;

  if not exists (
    select 1 from public.employees
    where id = p_employee_id and business_id = p_business_id and is_active = true
  ) then
    raise exception 'Colaborador nao encontrado ou inativo';
  end if;

  v_end_time := p_start_time + (v_duration || ' minutes')::interval;
  v_local_end := v_end_time at time zone v_time_zone;

  select * into v_override
  from public.business_day_overrides bdo
  where bdo.business_id = p_business_id
    and bdo.date = v_local_start::date;

  if found then
    if v_override.is_closed then
      raise exception 'Este dia no esta disponible para reservas';
    end if;

    v_ranges := coalesce(v_override.time_ranges, '[]'::jsonb);
  else
    v_dow := extract(dow from v_local_start)::int;
    if not (v_dow = any(v_working_days)) then
      raise exception 'Este dia no esta disponible para reservas';
    end if;

    v_dow_key := v_dow::text;
    v_ranges := coalesce(v_working_schedule -> v_dow_key, '[]'::jsonb);
  end if;

  select exists (
    select 1
    from public.time_ranges_from_json(v_ranges, v_opening, v_closing) tr
    where v_local_start::time >= tr.opening_time
      and v_local_end::time <= tr.closing_time
  ) into v_is_inside_range;

  if not v_is_inside_range then
    raise exception 'Horario nao disponivel';
  end if;

  select exists (
    select 1 from public.appointments
    where employee_id = p_employee_id
      and status not in ('cancelled')
      and start_time < v_end_time
      and end_time > p_start_time
  ) into v_conflict;

  if v_conflict then
    raise exception 'Horario nao disponivel';
  end if;

  insert into public.clients (business_id, name, email, phone, birthdate, last_appointment_at)
  values (p_business_id, p_client_name, p_client_email, p_client_phone, p_client_birthdate, p_start_time)
  on conflict (business_id, email) do update
    set name = excluded.name,
        phone = excluded.phone,
        birthdate = coalesce(excluded.birthdate, public.clients.birthdate),
        last_appointment_at = greatest(coalesce(public.clients.last_appointment_at, excluded.last_appointment_at), excluded.last_appointment_at)
  returning id into v_client_id;

  insert into public.appointments (
    business_id, service_id, employee_id,
    client_name, client_email, client_phone, client_birthdate,
    start_time, end_time, status, notes
  )
  values (
    p_business_id, p_service_id, p_employee_id,
    p_client_name, p_client_email, p_client_phone, p_client_birthdate,
    p_start_time, v_end_time, 'pending', p_notes
  )
  returning id into v_appt_id;

  perform public.enqueue_appointment_notifications(v_appt_id);

  update public.notification_events
  set client_id = v_client_id
  where appointment_id = v_appt_id
    and client_id is null;

  return v_appt_id;
end;
$$;

grant execute on function public.create_public_appointment(
  uuid, uuid, uuid, text, text, text, date, timestamptz, text
) to anon, authenticated;

commit;
