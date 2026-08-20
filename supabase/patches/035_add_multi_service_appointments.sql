-- TurboAgenda - Multiple services per public appointment
-- Keeps appointments.service_id as the primary service and stores the full selection separately.

begin;

create table if not exists public.appointment_services (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  position int not null default 0,
  duration_minutes int not null,
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (appointment_id, service_id)
);

create index if not exists idx_appointment_services_appointment_id
  on public.appointment_services(appointment_id, position);

create index if not exists idx_appointment_services_service_id
  on public.appointment_services(service_id);

alter table public.appointment_services enable row level security;

drop policy if exists "appointment_services_owner_read" on public.appointment_services;
create policy "appointment_services_owner_read"
  on public.appointment_services for select
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and public.is_business_owner(a.business_id)
    )
  );

drop policy if exists "platform_admin_appointment_services_read" on public.appointment_services;
create policy "platform_admin_appointment_services_read"
  on public.appointment_services for select
  using (public.is_platform_admin());

grant select on table public.appointment_services to authenticated;
grant select, insert, update, delete on table public.appointment_services to service_role;

create or replace function public.get_available_slots(
  p_business_id uuid,
  p_service_id uuid,
  p_employee_id uuid,
  p_date date,
  p_service_ids uuid[] default null
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
  v_service_count int;
  v_service_ids uuid[];
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
  v_service_ids := coalesce(p_service_ids, array[p_service_id]);

  select array_agg(service_id order by first_position)
  into v_service_ids
  from (
    select service_id, min(position) as first_position
    from unnest(v_service_ids) with ordinality as selected(service_id, position)
    where service_id is not null
    group by service_id
  ) selected_services;

  if coalesce(cardinality(v_service_ids), 0) = 0 then
    return v_slots;
  end if;

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

  select coalesce(sum(duration_minutes), 0)::int, count(*)::int
  into v_duration, v_service_count
  from public.services
  where id = any(v_service_ids)
    and business_id = p_business_id
    and is_active = true;

  if v_service_count <> cardinality(v_service_ids) or v_duration <= 0 then
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

grant execute on function public.get_available_slots(uuid, uuid, uuid, date, uuid[]) to anon, authenticated;

create or replace function public.create_public_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_employee_id uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_client_birthdate date,
  p_start_time timestamptz,
  p_notes text default null,
  p_service_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_service_count int;
  v_service_ids uuid[];
  v_primary_service_id uuid;
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

  v_service_ids := coalesce(p_service_ids, array[p_service_id]);

  select array_agg(service_id order by first_position)
  into v_service_ids
  from (
    select service_id, min(position) as first_position
    from unnest(v_service_ids) with ordinality as selected(service_id, position)
    where service_id is not null
    group by service_id
  ) selected_services;

  if coalesce(cardinality(v_service_ids), 0) = 0 then
    raise exception 'Servico nao encontrado ou inativo';
  end if;

  v_primary_service_id := coalesce(p_service_id, v_service_ids[1]);
  if not (v_primary_service_id = any(v_service_ids)) then
    v_primary_service_id := v_service_ids[1];
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

  select coalesce(sum(duration_minutes), 0)::int, count(*)::int
  into v_duration, v_service_count
  from public.services
  where id = any(v_service_ids)
    and business_id = p_business_id
    and is_active = true;

  if v_service_count <> cardinality(v_service_ids) or v_duration <= 0 then
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
    p_business_id, v_primary_service_id, p_employee_id,
    p_client_name, v_client_email, p_client_phone, p_client_birthdate,
    p_start_time, v_end_time, 'pending', p_notes
  )
  returning id into v_appt_id;

  insert into public.appointment_services (
    appointment_id, service_id, position, duration_minutes, price
  )
  select v_appt_id, s.id, selected.position::int - 1, s.duration_minutes, s.price
  from unnest(v_service_ids) with ordinality as selected(service_id, position)
  join public.services s on s.id = selected.service_id
  order by selected.position;

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
  uuid, uuid, uuid, text, text, text, date, timestamptz, text, uuid[]
) to anon, authenticated;

create or replace function public.get_appointment_email_payload(
  p_appointment_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with service_summary as (
    select
      aps.appointment_id,
      string_agg(s.name, ' + ' order by aps.position) as service_names,
      coalesce(sum(aps.duration_minutes), 0)::int as duration_minutes,
      coalesce(sum(aps.price), 0)::numeric(10,2) as price
    from public.appointment_services aps
    join public.services s on s.id = aps.service_id
    where aps.appointment_id = p_appointment_id
    group by aps.appointment_id
  )
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
      'name', coalesce(ss.service_names, s.name),
      'duration_minutes', coalesce(ss.duration_minutes, s.duration_minutes),
      'price', coalesce(ss.price, s.price)
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
  left join service_summary ss on ss.appointment_id = a.id
  left join public.employees e on e.id = a.employee_id
  where a.id = p_appointment_id;
$$;

grant execute on function public.get_appointment_email_payload(uuid) to anon, authenticated;

commit;
