-- TurboAgenda - MB WAY deposit proof before blocking public appointments
-- Safe to run once in Supabase SQL Editor.

begin;

alter table public.business_settings
  add column if not exists deposit_required_enabled boolean not null default false,
  add column if not exists deposit_percent int not null default 30,
  add column if not exists deposit_mbway_phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_settings_deposit_percent_check'
  ) then
    alter table public.business_settings
      add constraint business_settings_deposit_percent_check
      check (deposit_percent between 1 and 100);
  end if;
end;
$$;

alter table public.appointments
  add column if not exists deposit_required boolean not null default false,
  add column if not exists deposit_percent int,
  add column if not exists deposit_amount numeric(10,2),
  add column if not exists deposit_currency text,
  add column if not exists payment_method text,
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists payment_proof_path text,
  add column if not exists payment_submitted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_payment_status_check'
  ) then
    alter table public.appointments
      add constraint appointments_payment_status_check
      check (payment_status in ('not_required','proof_submitted','approved','rejected'));
  end if;
end;
$$;

create index if not exists idx_appointments_payment_status
  on public.appointments(business_id, payment_status, start_time);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop function if exists public.create_public_appointment(
  uuid, uuid, uuid, text, text, text, date, timestamptz, text, uuid[]
);

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
  p_service_ids uuid[] default null,
  p_payment_proof_path text default null
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
  v_deposit_required boolean;
  v_deposit_percent int;
  v_deposit_mbway_phone text;
  v_currency text;
  v_total_price numeric(10,2);
  v_deposit_amount numeric(10,2);
  v_payment_proof_path text := nullif(trim(coalesce(p_payment_proof_path, '')), '');
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
    coalesce(bs.max_booking_days, 30),
    coalesce(bs.opening_time, '09:00'::time),
    coalesce(bs.closing_time, '18:00'::time),
    coalesce(bs.slot_duration_minutes, 30),
    coalesce(bs.working_days, '{1,2,3,4,5}'::int[]),
    coalesce(bs.time_zone, 'Europe/Lisbon'),
    coalesce(bs.available_months, '{}'::text[]),
    coalesce(bs.working_schedule, '{}'::jsonb),
    coalesce(bs.deposit_required_enabled, false),
    coalesce(bs.deposit_percent, 30),
    nullif(trim(coalesce(bs.deposit_mbway_phone, '')), ''),
    coalesce(b.currency, 'EUR')
  into
    v_max_days, v_opening, v_closing, v_slot_min, v_working_days,
    v_time_zone, v_available_months, v_working_schedule, v_deposit_required,
    v_deposit_percent, v_deposit_mbway_phone, v_currency
  from public.business_settings bs
  join public.businesses b on b.id = bs.business_id
  where bs.business_id = p_business_id;

  if not found then
    select coalesce(currency, 'EUR') into v_currency
    from public.businesses
    where id = p_business_id;

    v_max_days := 30;
    v_opening := '09:00'::time;
    v_closing := '18:00'::time;
    v_slot_min := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
    v_time_zone := 'Europe/Lisbon';
    v_available_months := '{}'::text[];
    v_working_schedule := '{}'::jsonb;
    v_deposit_required := false;
    v_deposit_percent := 30;
    v_deposit_mbway_phone := null;
  end if;

  v_deposit_required := v_deposit_required and v_deposit_mbway_phone is not null;

  if v_deposit_required then
    if v_payment_proof_path is null then
      raise exception 'Carregue o comprovativo MB WAY para bloquear o horario';
    end if;

    if position(p_business_id::text || '/' in v_payment_proof_path) <> 1 then
      raise exception 'Comprovativo invalido';
    end if;

    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'payment-proofs'
        and name = v_payment_proof_path
    ) then
      raise exception 'Comprovativo nao encontrado';
    end if;
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

  select coalesce(sum(duration_minutes), 0)::int, count(*)::int, coalesce(sum(price), 0)::numeric(10,2)
  into v_duration, v_service_count, v_total_price
  from public.services
  where id = any(v_service_ids)
    and business_id = p_business_id
    and is_active = true;

  if v_service_count <> cardinality(v_service_ids) or v_duration <= 0 then
    raise exception 'Servico nao encontrado ou inativo';
  end if;

  v_deposit_amount := round((v_total_price * v_deposit_percent / 100.0)::numeric, 2);

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
    start_time, end_time, status, notes,
    deposit_required, deposit_percent, deposit_amount, deposit_currency,
    payment_method, payment_status, payment_proof_path, payment_submitted_at
  )
  values (
    p_business_id, v_primary_service_id, p_employee_id,
    p_client_name, v_client_email, p_client_phone, p_client_birthdate,
    p_start_time, v_end_time, 'pending', p_notes,
    v_deposit_required,
    case when v_deposit_required then v_deposit_percent else null end,
    case when v_deposit_required then v_deposit_amount else null end,
    case when v_deposit_required then v_currency else null end,
    case when v_deposit_required then 'mbway' else null end,
    case when v_deposit_required then 'proof_submitted' else 'not_required' end,
    case when v_deposit_required then v_payment_proof_path else null end,
    case when v_deposit_required then now() else null end
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
  uuid, uuid, uuid, text, text, text, date, timestamptz, text, uuid[], text
) to anon, authenticated;

commit;
