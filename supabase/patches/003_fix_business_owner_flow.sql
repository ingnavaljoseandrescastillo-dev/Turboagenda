-- ============================================================
-- TurboAgenda - Fix business ownership bootstrap/RLS flow
-- Safe to run multiple times in Supabase SQL Editor.
-- Does not delete users or existing business data.
-- ============================================================

create extension if not exists "uuid-ossp";

-- Helpful indexes for owner fallback lookups.
create index if not exists idx_businesses_owner on public.businesses(owner_id);

alter table public.businesses enable row level security;
alter table public.business_owners enable row level security;
alter table public.business_settings enable row level security;
alter table public.employees enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;

-- The owner_id column is the source of truth. business_owners is a helper table.
create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) <> '00000000-0000-0000-0000-000000000000'::uuid
    and (
      exists (
        select 1
        from public.businesses b
        where b.id = p_business_id
          and b.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.business_owners bo
        where bo.business_id = p_business_id
          and bo.user_id = auth.uid()
      )
    );
$$;

-- Backfill helper rows for existing businesses.
insert into public.business_owners (user_id, business_id)
select b.owner_id, b.id
from public.businesses b
where b.owner_id is not null
on conflict (user_id, business_id) do nothing;

insert into public.business_settings (business_id)
select b.id
from public.businesses b
on conflict (business_id) do nothing;

insert into public.subscriptions (business_id)
select b.id
from public.businesses b
on conflict (business_id) do nothing;

-- Recreate ownership bootstrap trigger with idempotent inserts.
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

  insert into public.business_settings (business_id)
  values (new.id)
  on conflict (business_id) do nothing;

  insert into public.subscriptions (business_id)
  values (new.id)
  on conflict (business_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_business_created on public.businesses;
create trigger on_business_created
  after insert on public.businesses
  for each row execute procedure public.handle_new_business();

-- Drop old policy names from the initial migration and from this patch.
drop policy if exists "Owner can manage own business" on public.businesses;
drop policy if exists "Public can read businesses by slug" on public.businesses;
drop policy if exists "Owners can see own records" on public.business_owners;
drop policy if exists "Owners can insert own records" on public.business_owners;
drop policy if exists "Owner manages settings" on public.business_settings;
drop policy if exists "Public can read settings" on public.business_settings;
drop policy if exists "Owner manages employees" on public.employees;
drop policy if exists "Public can read active employees" on public.employees;
drop policy if exists "Owner manages services" on public.services;
drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Owner manages clients" on public.clients;
drop policy if exists "Owner can read appointments" on public.appointments;
drop policy if exists "Owner can update appointments" on public.appointments;
drop policy if exists "Owner can delete appointments" on public.appointments;
drop policy if exists "Public can read reviews" on public.reviews;
drop policy if exists "Owner can manage reviews" on public.reviews;
drop policy if exists "Owner can view own subscription" on public.subscriptions;

drop policy if exists "businesses_public_read" on public.businesses;
drop policy if exists "businesses_owner_manage" on public.businesses;
drop policy if exists "business_owners_owner_read" on public.business_owners;
drop policy if exists "business_owners_owner_insert" on public.business_owners;
drop policy if exists "business_owners_owner_delete" on public.business_owners;
drop policy if exists "business_settings_public_read" on public.business_settings;
drop policy if exists "business_settings_owner_manage" on public.business_settings;
drop policy if exists "employees_public_read_active" on public.employees;
drop policy if exists "employees_owner_manage" on public.employees;
drop policy if exists "services_public_read_active" on public.services;
drop policy if exists "services_owner_manage" on public.services;
drop policy if exists "clients_owner_manage" on public.clients;
drop policy if exists "appointments_owner_read" on public.appointments;
drop policy if exists "appointments_owner_insert" on public.appointments;
drop policy if exists "appointments_owner_update" on public.appointments;
drop policy if exists "appointments_owner_delete" on public.appointments;
drop policy if exists "reviews_public_read" on public.reviews;
drop policy if exists "reviews_owner_manage" on public.reviews;
drop policy if exists "subscriptions_owner_read" on public.subscriptions;

-- businesses
create policy "businesses_public_read"
  on public.businesses for select
  using (true);

create policy "businesses_owner_manage"
  on public.businesses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- business_owners
create policy "business_owners_owner_read"
  on public.business_owners for select
  using (user_id = auth.uid() or public.is_business_owner(business_id));

create policy "business_owners_owner_insert"
  on public.business_owners for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "business_owners_owner_delete"
  on public.business_owners for delete
  using (public.is_business_owner(business_id));

-- business_settings
create policy "business_settings_public_read"
  on public.business_settings for select
  using (true);

create policy "business_settings_owner_manage"
  on public.business_settings for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- employees
create policy "employees_public_read_active"
  on public.employees for select
  using (is_active = true);

create policy "employees_owner_manage"
  on public.employees for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- services
create policy "services_public_read_active"
  on public.services for select
  using (is_active = true);

create policy "services_owner_manage"
  on public.services for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- clients
create policy "clients_owner_manage"
  on public.clients for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- appointments
create policy "appointments_owner_read"
  on public.appointments for select
  using (public.is_business_owner(business_id));

create policy "appointments_owner_insert"
  on public.appointments for insert
  with check (public.is_business_owner(business_id));

create policy "appointments_owner_update"
  on public.appointments for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "appointments_owner_delete"
  on public.appointments for delete
  using (public.is_business_owner(business_id));

-- reviews
create policy "reviews_public_read"
  on public.reviews for select
  using (true);

create policy "reviews_owner_manage"
  on public.reviews for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- subscriptions
create policy "subscriptions_owner_read"
  on public.subscriptions for select
  using (public.is_business_owner(business_id));
