-- ============================================================
-- TurboAgenda — Initial Schema
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- businesses
create table if not exists public.businesses (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  phone       text,
  address     text,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- business_owners  (many-to-one: multiple users can manage a business)
create table if not exists public.business_owners (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, business_id)
);

-- business_settings
create table if not exists public.business_settings (
  id                      uuid primary key default uuid_generate_v4(),
  business_id             uuid unique not null references public.businesses(id) on delete cascade,
  opening_time            time not null default '09:00',
  closing_time            time not null default '18:00',
  slot_duration_minutes   int  not null default 30,
  working_days            int[] not null default '{1,2,3,4,5}', -- 0=Sun … 6=Sat
  created_at              timestamptz not null default now()
);

-- employees
create table if not exists public.employees (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  role        text not null default 'Colaborador',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- services
create table if not exists public.services (
  id                uuid primary key default uuid_generate_v4(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null,
  description       text,
  duration_minutes  int  not null default 30,
  price             numeric(10,2) not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- clients
create table if not exists public.clients (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  created_at  timestamptz not null default now(),
  unique(business_id, email)
);

-- appointments
create table if not exists public.appointments (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  service_id   uuid not null references public.services(id)  on delete restrict,
  employee_id  uuid not null references public.employees(id) on delete restrict,
  client_name  text not null,
  client_email text not null,
  client_phone text,
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  status       text not null default 'pending'
                 check (status in ('pending','confirmed','cancelled','completed')),
  notes        text,
  created_at   timestamptz not null default now()
);

-- reviews
create table if not exists public.reviews (
  id             uuid primary key default uuid_generate_v4(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  client_name    text not null,
  rating         int  not null check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);

-- subscriptions
create table if not exists public.subscriptions (
  id                  uuid primary key default uuid_generate_v4(),
  business_id         uuid unique not null references public.businesses(id) on delete cascade,
  plan                text not null default 'trial'
                        check (plan in ('trial','basic','plus','pro')),
  status              text not null default 'trial'
                        check (status in ('trial','active','cancelled','past_due')),
  trial_ends_at       timestamptz default (now() + interval '30 days'),
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_businesses_slug       on public.businesses(slug);
create index if not exists idx_business_owners_user  on public.business_owners(user_id);
create index if not exists idx_business_owners_biz   on public.business_owners(business_id);
create index if not exists idx_employees_business    on public.employees(business_id);
create index if not exists idx_services_business     on public.services(business_id);
create index if not exists idx_appointments_business on public.appointments(business_id);
create index if not exists idx_appointments_time     on public.appointments(business_id, start_time);
create index if not exists idx_appointments_employee on public.appointments(employee_id, start_time);
create index if not exists idx_reviews_business      on public.reviews(business_id);
create index if not exists idx_clients_business      on public.clients(business_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.businesses        enable row level security;
alter table public.business_owners   enable row level security;
alter table public.business_settings enable row level security;
alter table public.employees         enable row level security;
alter table public.services          enable row level security;
alter table public.clients           enable row level security;
alter table public.appointments      enable row level security;
alter table public.reviews           enable row level security;
alter table public.subscriptions     enable row level security;

-- Helper: is the current user an owner of a given business?
drop function if exists public.is_business_owner(uuid) cascade;
create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.business_owners
    where user_id = auth.uid() and business_id = p_business_id
  );
$$;

-- Drop all policies before (re)creating — CREATE POLICY has no IF NOT EXISTS
drop policy if exists "Owner can manage own business"      on public.businesses;
drop policy if exists "Public can read businesses by slug" on public.businesses;
drop policy if exists "Owners can see own records"         on public.business_owners;
drop policy if exists "Owners can insert own records"      on public.business_owners;
drop policy if exists "Owner manages settings"             on public.business_settings;
drop policy if exists "Public can read settings"           on public.business_settings;
drop policy if exists "Owner manages employees"            on public.employees;
drop policy if exists "Public can read active employees"   on public.employees;
drop policy if exists "Owner manages services"             on public.services;
drop policy if exists "Public can read active services"    on public.services;
drop policy if exists "Owner manages clients"              on public.clients;
drop policy if exists "Owner can read appointments"        on public.appointments;
drop policy if exists "Owner can update appointments"      on public.appointments;
drop policy if exists "Owner can delete appointments"      on public.appointments;
drop policy if exists "Public can read reviews"            on public.reviews;
drop policy if exists "Owner can manage reviews"           on public.reviews;
drop policy if exists "Owner can view own subscription"    on public.subscriptions;

-- ---------- businesses ----------
-- Use owner_id directly — is_business_owner queries business_owners which doesn't
-- exist yet when a user first inserts a business (chicken-and-egg with the trigger).
create policy "Owner can manage own business"
  on public.businesses for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Public can read businesses by slug"
  on public.businesses for select
  using (true);

-- ---------- business_owners ----------
create policy "Owners can see own records"
  on public.business_owners for select
  using (user_id = auth.uid());

create policy "Owners can insert own records"
  on public.business_owners for insert
  with check (user_id = auth.uid());

-- ---------- business_settings ----------
create policy "Owner manages settings"
  on public.business_settings for all
  using  (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "Public can read settings"
  on public.business_settings for select
  using (true);

-- ---------- employees ----------
create policy "Owner manages employees"
  on public.employees for all
  using  (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "Public can read active employees"
  on public.employees for select
  using (is_active = true);

-- ---------- services ----------
create policy "Owner manages services"
  on public.services for all
  using  (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "Public can read active services"
  on public.services for select
  using (is_active = true);

-- ---------- clients ----------
create policy "Owner manages clients"
  on public.clients for all
  using  (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- ---------- appointments ----------
create policy "Owner can read appointments"
  on public.appointments for select
  using (public.is_business_owner(business_id));

create policy "Owner can update appointments"
  on public.appointments for update
  using  (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "Owner can delete appointments"
  on public.appointments for delete
  using (public.is_business_owner(business_id));

-- Public insert handled by create_public_appointment RPC (security definer)

-- ---------- reviews ----------
create policy "Public can read reviews"
  on public.reviews for select
  using (true);

create policy "Owner can manage reviews"
  on public.reviews for all
  using  (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- ---------- subscriptions ----------
create policy "Owner can view own subscription"
  on public.subscriptions for select
  using (public.is_business_owner(business_id));

-- ============================================================
-- RPC: get_available_slots
-- Returns array of available HH:MM time strings for a given date
-- ============================================================
drop function if exists public.get_available_slots(uuid, uuid, uuid, date) cascade;
create or replace function public.get_available_slots(
  p_business_id  uuid,
  p_service_id   uuid,
  p_employee_id  uuid,
  p_date         date
)
returns text[]
language plpgsql security definer stable
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
  -- Fetch business settings (defaults if not configured)
  select
    coalesce(bs.opening_time,    '09:00'::time),
    coalesce(bs.closing_time,    '18:00'::time),
    coalesce(bs.slot_duration_minutes, 30),
    coalesce(bs.working_days,    '{1,2,3,4,5}'::int[])
  into v_opening, v_closing, v_slot_min, v_working_days
  from public.business_settings bs
  where bs.business_id = p_business_id;

  -- If no settings row, use defaults
  if not found then
    v_opening     := '09:00'::time;
    v_closing     := '18:00'::time;
    v_slot_min    := 30;
    v_working_days := '{1,2,3,4,5}'::int[];
  end if;

  -- Check if requested date is a working day (0=Sun, 6=Sat)
  v_dow := extract(dow from p_date)::int;
  if not (v_dow = any(v_working_days)) then
    return v_slots;
  end if;

  -- Fetch service duration
  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and business_id = p_business_id and is_active = true;

  if not found then return v_slots; end if;

  -- Iterate slots
  v_current := v_opening;
  loop
    v_end_time := v_current + (v_duration || ' minutes')::interval;
    exit when v_end_time > v_closing;

    -- Check for conflicts with existing appointments
    select exists (
      select 1 from public.appointments
      where employee_id = p_employee_id
        and status not in ('cancelled')
        and start_time < (p_date + v_end_time)::timestamptz
        and end_time   > (p_date + v_current)::timestamptz
    ) into v_conflict;

    if not v_conflict then
      v_slots := array_append(v_slots, to_char(v_current, 'HH24:MI'));
    end if;

    v_current := v_current + (v_slot_min || ' minutes')::interval;
  end loop;

  return v_slots;
end;
$$;

-- ============================================================
-- RPC: create_public_appointment
-- Allows anonymous users to book — bypasses RLS via security definer
-- ============================================================
drop function if exists public.create_public_appointment(uuid, uuid, uuid, text, text, text, timestamptz, text) cascade;
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
as $$
declare
  v_duration  int;
  v_end_time  timestamptz;
  v_appt_id   uuid;
  v_conflict  boolean;
begin
  -- Validate service belongs to business and is active
  select duration_minutes into v_duration
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and is_active = true;

  if not found then
    raise exception 'Serviço não encontrado ou inativo';
  end if;

  -- Validate employee belongs to business and is active
  if not exists (
    select 1 from public.employees
    where id = p_employee_id and business_id = p_business_id and is_active = true
  ) then
    raise exception 'Colaborador não encontrado ou inativo';
  end if;

  v_end_time := p_start_time + (v_duration || ' minutes')::interval;

  -- Check for scheduling conflicts
  select exists (
    select 1 from public.appointments
    where employee_id = p_employee_id
      and status not in ('cancelled')
      and start_time < v_end_time
      and end_time   > p_start_time
  ) into v_conflict;

  if v_conflict then
    raise exception 'Horário não disponível';
  end if;

  -- Upsert client
  insert into public.clients (business_id, name, email, phone)
  values (p_business_id, p_client_name, p_client_email, p_client_phone)
  on conflict (business_id, email) do update
    set name  = excluded.name,
        phone = excluded.phone;

  -- Create appointment
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

-- ============================================================
-- AUTO-CREATE subscription + settings on new business insert
-- ============================================================
drop function if exists public.handle_new_business() cascade;
create or replace function public.handle_new_business()
returns trigger language plpgsql security definer
as $$
begin
  -- Register the primary owner in business_owners so is_business_owner() works
  insert into public.business_owners (user_id, business_id) values (new.owner_id, new.id);
  insert into public.subscriptions (business_id) values (new.id);
  insert into public.business_settings (business_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_business_created on public.businesses;
create trigger on_business_created
  after insert on public.businesses
  for each row execute procedure public.handle_new_business();
