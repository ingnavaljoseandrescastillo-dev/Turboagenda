-- ============================================================
-- TurboAgenda - Admin notes and audit log
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.admin_notes (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_email text,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete set null,
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_notes enable row level security;
alter table public.admin_audit_log enable row level security;

create index if not exists idx_admin_notes_business on public.admin_notes(business_id, created_at desc);
create index if not exists idx_admin_audit_business on public.admin_audit_log(business_id, created_at desc);
create index if not exists idx_admin_audit_admin on public.admin_audit_log(admin_user_id, created_at desc);

drop policy if exists "platform_admin_notes_read" on public.admin_notes;
drop policy if exists "platform_admin_notes_insert" on public.admin_notes;
drop policy if exists "platform_admin_audit_read" on public.admin_audit_log;
drop policy if exists "platform_admin_audit_insert" on public.admin_audit_log;

create policy "platform_admin_notes_read"
  on public.admin_notes for select
  using (public.is_platform_admin());

create policy "platform_admin_notes_insert"
  on public.admin_notes for insert
  with check (public.is_platform_admin());

create policy "platform_admin_audit_read"
  on public.admin_audit_log for select
  using (public.is_platform_admin());

create policy "platform_admin_audit_insert"
  on public.admin_audit_log for insert
  with check (public.is_platform_admin());

grant select, insert on table public.admin_notes to authenticated;
grant select, insert on table public.admin_audit_log to authenticated;
