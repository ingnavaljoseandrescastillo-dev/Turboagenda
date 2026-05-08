-- TurboAgenda - Business timezone support
-- Stores each business timezone and makes public booking/email payloads timezone-aware.
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.business_settings
  add column if not exists time_zone text not null default 'Europe/Lisbon';

update public.business_settings
set time_zone = 'Europe/Lisbon'
where time_zone is null or trim(time_zone) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_settings_time_zone_check'
  ) then
    alter table public.business_settings
      add constraint business_settings_time_zone_check
      check (char_length(time_zone) between 3 and 64);
  end if;
end $$;

create or replace function public.get_appointment_email_payload(
  p_appointment_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'client_name', a.client_name,
    'client_email', a.client_email,
    'client_phone', a.client_phone,
    'start_time', a.start_time,
    'end_time', a.end_time,
    'businesses', jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'phone', b.phone,
      'notification_email', b.notification_email
    ),
    'services', jsonb_build_object(
      'name', s.name,
      'duration_minutes', s.duration_minutes,
      'price', s.price
    ),
    'employees', jsonb_build_object(
      'name', e.name
    ),
    'business_settings', jsonb_build_object(
      'time_zone', coalesce(bs.time_zone, 'Europe/Lisbon'),
      'email_notify_client_on_booking', bs.email_notify_client_on_booking,
      'email_notify_business_on_booking', bs.email_notify_business_on_booking,
      'email_reminder_24h_enabled', bs.email_reminder_24h_enabled,
      'email_notify_client_on_cancellation', bs.email_notify_client_on_cancellation
    )
  )
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  left join public.business_settings bs on bs.business_id = a.business_id
  left join public.services s on s.id = a.service_id
  left join public.employees e on e.id = a.employee_id
  where a.id = p_appointment_id;
$$;

grant execute on function public.get_appointment_email_payload(uuid) to anon, authenticated;

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
  v_time_zone     text;
  v_dow           int;
  v_current       time;
  v_end_time      time;
  v_slot_start    timestamptz;
  v_slot_end      timestamptz;
  v_slots         text[] := '{}';
  v_conflict      boolean;
  v_override      public.business_day_overrides%rowtype;
  v_has_special   boolean := false;
begin
  select
    coalesce(bs.opening_time, '09:00'::time),
    coalesce(bs.closing_time, '18:00'::time),
    coalesce(bs.slot_duration_minutes, 30),
    coalesce(bs.working_days, '{1,2,3,4,5}'::int[]),
    coalesce(bs.time_zone, 'Europe/Lisbon')
  into v_opening, v_closing, v_slot_min, v_working_days, v_time_zone
  from public.business_settings bs
  where bs.business_id = p_business_id;

  if not found then
    v_opening := '09:00'::time;
    v_closing := '18:00'::time;
    v_slot_min := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
    v_time_zone := 'Europe/Lisbon';
  end if;

  select * into v_override
  from public.business_day_overrides bdo
  where bdo.business_id = p_business_id
    and bdo.date = p_date;

  if found then
    if v_override.is_closed then
      return v_slots;
    end if;

    if v_override.opening_time is not null and v_override.closing_time is not null then
      v_opening := v_override.opening_time;
      v_closing := v_override.closing_time;
      v_slot_min := coalesce(v_override.slot_duration_minutes, v_slot_min);
      v_has_special := true;
    end if;
  end if;

  v_dow := extract(dow from p_date)::int;
  if not v_has_special and not (v_dow = any(v_working_days)) then
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

  return v_slots;
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
  v_dow int;
  v_override public.business_day_overrides%rowtype;
  v_has_special boolean := false;
begin
  select
    coalesce(max_booking_days, 30),
    coalesce(opening_time, '09:00'::time),
    coalesce(closing_time, '18:00'::time),
    coalesce(slot_duration_minutes, 30),
    coalesce(working_days, '{1,2,3,4,5}'::int[]),
    coalesce(time_zone, 'Europe/Lisbon')
  into v_max_days, v_opening, v_closing, v_slot_min, v_working_days, v_time_zone
  from public.business_settings
  where business_id = p_business_id;

  if not found then
    v_max_days := 30;
    v_opening := '09:00'::time;
    v_closing := '18:00'::time;
    v_slot_min := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
    v_time_zone := 'Europe/Lisbon';
  end if;

  v_local_start := p_start_time at time zone v_time_zone;

  if p_start_time < date_trunc('day', now()) then
    raise exception 'Nao e possivel reservar datas passadas';
  end if;

  if p_start_time >= (date_trunc('day', now()) + (v_max_days || ' days')::interval) then
    raise exception 'Reservas disponiveis apenas nos proximos % dias', v_max_days;
  end if;

  select * into v_override
  from public.business_day_overrides bdo
  where bdo.business_id = p_business_id
    and bdo.date = v_local_start::date;

  if found then
    if v_override.is_closed then
      raise exception 'Este dia no esta disponible para reservas';
    end if;

    if v_override.opening_time is not null and v_override.closing_time is not null then
      v_opening := v_override.opening_time;
      v_closing := v_override.closing_time;
      v_slot_min := coalesce(v_override.slot_duration_minutes, v_slot_min);
      v_has_special := true;
    end if;
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

  v_dow := extract(dow from v_local_start)::int;
  if not v_has_special and not (v_dow = any(v_working_days)) then
    raise exception 'Este dia no esta disponible para reservas';
  end if;

  if v_local_start::time < v_opening or v_local_end::time > v_closing then
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
