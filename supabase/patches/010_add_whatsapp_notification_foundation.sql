-- ============================================================
-- TurboAgenda - WhatsApp notification foundation
-- Safe to run multiple times in Supabase SQL Editor.
-- This does not send messages; it records notification jobs/events.
-- ============================================================

create extension if not exists "uuid-ossp";

alter table public.business_settings
  add column if not exists whatsapp_enabled boolean not null default false,
  add column if not exists whatsapp_notify_client_on_booking boolean not null default true,
  add column if not exists whatsapp_notify_business_on_booking boolean not null default true,
  add column if not exists whatsapp_reminder_24h_enabled boolean not null default true,
  add column if not exists whatsapp_birthday_enabled boolean not null default false;

alter table public.clients
  add column if not exists birthdate date,
  add column if not exists last_appointment_at timestamptz;

alter table public.appointments
  add column if not exists client_birthdate date;

create table if not exists public.notification_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email','system')),
  event_type text not null check (
    event_type in (
      'appointment_created_client',
      'appointment_created_business',
      'appointment_reminder_24h',
      'birthday_greeting'
    )
  ),
  recipient_type text not null check (recipient_type in ('client','business')),
  recipient_name text,
  recipient_phone text,
  status text not null default 'queued' check (status in ('queued','skipped','sent','failed')),
  scheduled_for timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notification_events enable row level security;

create index if not exists idx_notification_events_business on public.notification_events(business_id, created_at desc);
create index if not exists idx_notification_events_status on public.notification_events(status, scheduled_for);
create index if not exists idx_notification_events_appointment on public.notification_events(appointment_id);
create index if not exists idx_clients_birthdate on public.clients(business_id, birthdate);
create index if not exists idx_clients_last_appointment on public.clients(business_id, last_appointment_at);

drop policy if exists "notification_events_owner_read" on public.notification_events;
drop policy if exists "notification_events_owner_insert" on public.notification_events;
drop policy if exists "notification_events_platform_admin_read" on public.notification_events;

create policy "notification_events_owner_read"
  on public.notification_events for select
  using (public.is_business_owner(business_id));

create policy "notification_events_owner_insert"
  on public.notification_events for insert
  with check (public.is_business_owner(business_id));

create policy "notification_events_platform_admin_read"
  on public.notification_events for select
  using (public.is_platform_admin());

grant select, insert, update on table public.notification_events to authenticated;
grant select, insert on table public.notification_events to anon;
grant select, update on table public.business_settings to authenticated;
grant select, insert, update on table public.clients to authenticated;
grant select, insert, update on table public.appointments to authenticated;

create or replace function public.enqueue_appointment_notifications(
  p_appointment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_business public.businesses%rowtype;
  v_settings public.business_settings%rowtype;
begin
  select * into v_appt
  from public.appointments
  where id = p_appointment_id;

  if not found then
    return;
  end if;

  select * into v_business
  from public.businesses
  where id = v_appt.business_id;

  select * into v_settings
  from public.business_settings
  where business_id = v_appt.business_id;

  if not coalesce(v_settings.whatsapp_enabled, false) then
    return;
  end if;

  if coalesce(v_settings.whatsapp_notify_client_on_booking, true)
     and nullif(v_appt.client_phone, '') is not null then
    insert into public.notification_events (
      business_id, appointment_id, channel, event_type, recipient_type,
      recipient_name, recipient_phone, payload
    )
    values (
      v_appt.business_id, v_appt.id, 'whatsapp', 'appointment_created_client', 'client',
      v_appt.client_name, v_appt.client_phone,
      jsonb_build_object(
        'business_name', v_business.name,
        'appointment_start', v_appt.start_time,
        'message_template', 'Reserva criada em {{business_name}} para {{appointment_start}}.'
      )
    );
  end if;

  if coalesce(v_settings.whatsapp_notify_business_on_booking, true)
     and nullif(v_business.phone, '') is not null then
    insert into public.notification_events (
      business_id, appointment_id, channel, event_type, recipient_type,
      recipient_name, recipient_phone, payload
    )
    values (
      v_appt.business_id, v_appt.id, 'whatsapp', 'appointment_created_business', 'business',
      v_business.name, v_business.phone,
      jsonb_build_object(
        'client_name', v_appt.client_name,
        'appointment_start', v_appt.start_time,
        'message_template', 'Nova reserva de {{client_name}} para {{appointment_start}}.'
      )
    );
  end if;

  if coalesce(v_settings.whatsapp_reminder_24h_enabled, true)
     and nullif(v_appt.client_phone, '') is not null
     and v_appt.start_time > now() + interval '24 hours' then
    insert into public.notification_events (
      business_id, appointment_id, channel, event_type, recipient_type,
      recipient_name, recipient_phone, scheduled_for, payload
    )
    values (
      v_appt.business_id, v_appt.id, 'whatsapp', 'appointment_reminder_24h', 'client',
      v_appt.client_name, v_appt.client_phone, v_appt.start_time - interval '24 hours',
      jsonb_build_object(
        'business_name', v_business.name,
        'business_phone', v_business.phone,
        'appointment_start', v_appt.start_time,
        'message_template', 'Recordatorio: tiene una reserva en {{business_name}} manana. Si no puede asistir, comuniquese a {{business_phone}}.'
      )
    );
  end if;
end;
$$;

grant execute on function public.enqueue_appointment_notifications(uuid) to anon, authenticated;

drop function if exists public.create_public_appointment(uuid, uuid, uuid, text, text, text, date, timestamptz, text);

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
  v_appt_id uuid;
  v_client_id uuid;
  v_conflict boolean;
  v_max_days int;
begin
  select coalesce(max_booking_days, 30)
  into v_max_days
  from public.business_settings
  where business_id = p_business_id;

  if not found then
    v_max_days := 30;
  end if;

  if p_start_time < date_trunc('day', now()) then
    raise exception 'Nao e possivel reservar datas passadas';
  end if;

  if p_start_time >= (date_trunc('day', now()) + (v_max_days || ' days')::interval) then
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

grant execute on function public.create_public_appointment(uuid, uuid, uuid, text, text, text, date, timestamptz, text) to anon, authenticated;

create or replace function public.create_public_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_employee_id uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_start_time timestamptz,
  p_notes text default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.create_public_appointment(
    p_business_id,
    p_service_id,
    p_employee_id,
    p_client_name,
    p_client_email,
    p_client_phone,
    null::date,
    p_start_time,
    p_notes
  );
$$;

grant execute on function public.create_public_appointment(uuid, uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;
