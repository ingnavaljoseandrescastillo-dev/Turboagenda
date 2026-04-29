-- ============================================================
-- TurboAgenda - Platform admin foundation
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.platform_admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.platform_admins enable row level security;

alter table public.businesses
  add column if not exists is_paused boolean not null default false,
  add column if not exists paused_at timestamptz,
  add column if not exists pause_reason text;

alter table public.subscriptions
  add column if not exists manual_override boolean not null default false,
  add column if not exists price_cents int not null default 0,
  add column if not exists currency text not null default 'EUR',
  add column if not exists notes text;

create index if not exists idx_platform_admins_user on public.platform_admins(user_id);
create index if not exists idx_businesses_paused on public.businesses(is_paused);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_plan on public.subscriptions(plan);

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

drop policy if exists "platform_admins_can_read_self" on public.platform_admins;
drop policy if exists "platform_admins_can_manage_admins" on public.platform_admins;

create policy "platform_admins_can_read_self"
  on public.platform_admins for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy "platform_admins_can_manage_admins"
  on public.platform_admins for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "platform_admin_businesses_read" on public.businesses;
drop policy if exists "platform_admin_businesses_update" on public.businesses;
drop policy if exists "platform_admin_business_owners_read" on public.business_owners;
drop policy if exists "platform_admin_settings_read" on public.business_settings;
drop policy if exists "platform_admin_employees_read" on public.employees;
drop policy if exists "platform_admin_services_read" on public.services;
drop policy if exists "platform_admin_clients_read" on public.clients;
drop policy if exists "platform_admin_appointments_read" on public.appointments;
drop policy if exists "platform_admin_reviews_read" on public.reviews;
drop policy if exists "platform_admin_subscriptions_read" on public.subscriptions;
drop policy if exists "platform_admin_subscriptions_update" on public.subscriptions;

create policy "platform_admin_businesses_read"
  on public.businesses for select
  using (public.is_platform_admin());

create policy "platform_admin_businesses_update"
  on public.businesses for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admin_business_owners_read"
  on public.business_owners for select
  using (public.is_platform_admin());

create policy "platform_admin_settings_read"
  on public.business_settings for select
  using (public.is_platform_admin());

create policy "platform_admin_employees_read"
  on public.employees for select
  using (public.is_platform_admin());

create policy "platform_admin_services_read"
  on public.services for select
  using (public.is_platform_admin());

create policy "platform_admin_clients_read"
  on public.clients for select
  using (public.is_platform_admin());

create policy "platform_admin_appointments_read"
  on public.appointments for select
  using (public.is_platform_admin());

create policy "platform_admin_reviews_read"
  on public.reviews for select
  using (public.is_platform_admin());

create policy "platform_admin_subscriptions_read"
  on public.subscriptions for select
  using (public.is_platform_admin());

create policy "platform_admin_subscriptions_update"
  on public.subscriptions for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant usage on schema public to authenticated;
grant select on table public.platform_admins to authenticated;
grant select, update on table public.businesses to authenticated;
grant select on table public.business_owners to authenticated;
grant select on table public.business_settings to authenticated;
grant select on table public.employees to authenticated;
grant select on table public.services to authenticated;
grant select on table public.clients to authenticated;
grant select on table public.appointments to authenticated;
grant select on table public.reviews to authenticated;
grant select, update on table public.subscriptions to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

-- After running this patch, promote your own user once:
--
-- insert into public.platform_admins (user_id)
-- select id from auth.users where email = 'YOUR_EMAIL_HERE'
-- on conflict (user_id) do nothing;
