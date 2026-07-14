-- TurboAgenda - Optional client email for appointments
-- Allows bookings with a phone number when the client does not provide email.
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.appointments
  alter column client_email drop not null;

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
  v_client_email text := nullif(trim(p_client_email), '');
begin
  if nullif(trim(p_client_name), '') is null then
    raise exception 'Nome obrigatorio';
  end if;

  if v_client_email is null and nullif(trim(coalesce(p_client_phone, '')), '') is null then
    raise exception 'Informe email ou telefone para contacto';
  end if;

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

  if v_client_email is not null then
    insert into public.clients (business_id, name, email, phone, birthdate, last_appointment_at)
    values (p_business_id, p_client_name, v_client_email, p_client_phone, p_client_birthdate, p_start_time)
    on conflict (business_id, email) do update
      set name = excluded.name,
          phone = coalesce(excluded.phone, public.clients.phone),
          birthdate = coalesce(excluded.birthdate, public.clients.birthdate),
          last_appointment_at = greatest(coalesce(public.clients.last_appointment_at, excluded.last_appointment_at), excluded.last_appointment_at)
    returning id into v_client_id;
  end if;

  insert into public.appointments (
    business_id, service_id, employee_id,
    client_name, client_email, client_phone, client_birthdate,
    start_time, end_time, status, notes
  )
  values (
    p_business_id, p_service_id, p_employee_id,
    p_client_name, v_client_email, p_client_phone, p_client_birthdate,
    p_start_time, v_end_time, 'pending', p_notes
  )
  returning id into v_appt_id;

  perform public.enqueue_appointment_notifications(v_appt_id);

  if v_client_id is not null then
    update public.notification_events
    set client_id = v_client_id
    where appointment_id = v_appt_id
      and client_id is null;
  end if;

  return v_appt_id;
end;
$$;

grant execute on function public.create_public_appointment(
  uuid, uuid, uuid, text, text, text, date, timestamptz, text
) to anon, authenticated;

commit;
