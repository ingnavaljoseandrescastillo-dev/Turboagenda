-- TurboAgenda - Editable service categories for public tabs
-- Categories are optional; existing services keep working without one.

begin;

create table if not exists public.service_categories (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_categories_business_order
  on public.service_categories(business_id, display_order, name);

alter table public.service_categories enable row level security;

drop policy if exists "service_categories_public_read_active" on public.service_categories;
create policy "service_categories_public_read_active"
  on public.service_categories for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "service_categories_owner_manage" on public.service_categories;
create policy "service_categories_owner_manage"
  on public.service_categories for all
  to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

drop policy if exists "platform_admin_service_categories_read" on public.service_categories;
create policy "platform_admin_service_categories_read"
  on public.service_categories for select
  to authenticated
  using (public.is_platform_admin());

grant select on table public.service_categories to anon, authenticated;
grant insert, update, delete on table public.service_categories to authenticated;
grant select, insert, update, delete on table public.service_categories to service_role;

alter table public.services
  add column if not exists service_category_id uuid references public.service_categories(id) on delete set null,
  add column if not exists display_order int not null default 0;

create index if not exists idx_services_business_category_order
  on public.services(business_id, service_category_id, display_order, name)
  where deleted_at is null;

commit;
