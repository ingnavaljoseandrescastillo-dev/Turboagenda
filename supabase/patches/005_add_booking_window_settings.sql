-- ============================================================
-- TurboAgenda - Add booking window setting
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

alter table public.business_settings
  add column if not exists max_booking_days int not null default 30;

alter table public.business_settings
  drop constraint if exists business_settings_max_booking_days_check;

alter table public.business_settings
  add constraint business_settings_max_booking_days_check
  check (max_booking_days between 1 and 365);

create or replace function public.handle_new_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_owners (user_id, business_id)
  values (new.owner_id, new.id)
  on conflict (user_id, business_id) do nothing;

  insert into public.business_settings (business_id, max_booking_days)
  values (new.id, 30)
  on conflict (business_id) do nothing;

  insert into public.subscriptions (business_id)
  values (new.id)
  on conflict (business_id) do nothing;

  return new;
end;
$$;

create or replace function public.create_public_appointment(
  p_business_id  uuid,
  p_service_id   uuid,
  p_employee_id  uuid,
  p_client_name  text,
  p_client_email text,
  p_client_phone text,
  p_start_time   timestamptz,
  p_notes        text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_duration  int;
  v_end_time  timestamptz;
  v_appt_id   uuid;
  v_conflict  boolean;
  v_max_days  int;
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
      and end_time   > p_start_time
  ) into v_conflict;

  if v_conflict then
    raise exception 'Horario nao disponivel';
  end if;

  insert into public.clients (business_id, name, email, phone)
  values (p_business_id, p_client_name, p_client_email, p_client_phone)
  on conflict (business_id, email) do update
    set name  = excluded.name,
        phone = excluded.phone;

  insert into public.appointments (
    business_id, service_id, employee_id,
    client_name, client_email, client_phone,
    start_time, end_time, status, notes
  )
  values (
    p_business_id, p_service_id, p_employee_id,
    p_client_name, p_client_email, p_client_phone,
    p_start_time, v_end_time, 'pending', p_notes
  )
  returning id into v_appt_id;

  return v_appt_id;
end;
$$;

grant execute on function public.create_public_appointment(uuid, uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;
