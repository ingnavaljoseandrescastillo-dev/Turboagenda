-- ============================================================
-- TurboAgenda - Business finance entries
-- Safe to run multiple times in Supabase SQL Editor.
-- Adds a simple ledger for each business: income and expenses.
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.business_finance_entries (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  category text not null default 'general',
  description text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  entry_date date not null default current_date,
  payment_method text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_finance_entries enable row level security;

create index if not exists idx_business_finance_entries_business_date
  on public.business_finance_entries(business_id, entry_date desc);

create index if not exists idx_business_finance_entries_type
  on public.business_finance_entries(business_id, type, entry_date desc);

drop policy if exists "business_finance_entries_owner_read" on public.business_finance_entries;
drop policy if exists "business_finance_entries_owner_insert" on public.business_finance_entries;
drop policy if exists "business_finance_entries_owner_update" on public.business_finance_entries;
drop policy if exists "business_finance_entries_owner_delete" on public.business_finance_entries;

create policy "business_finance_entries_owner_read"
  on public.business_finance_entries for select
  using (public.is_business_owner(business_id));

create policy "business_finance_entries_owner_insert"
  on public.business_finance_entries for insert
  with check (public.is_business_owner(business_id));

create policy "business_finance_entries_owner_update"
  on public.business_finance_entries for update
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "business_finance_entries_owner_delete"
  on public.business_finance_entries for delete
  using (public.is_business_owner(business_id));

grant select, insert, update, delete on table public.business_finance_entries to authenticated;
