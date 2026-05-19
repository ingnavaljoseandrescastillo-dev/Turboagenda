-- ============================================================
-- TurboAgenda - Admin manual billing ledger
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

create extension if not exists "uuid-ossp";

alter table public.subscriptions
  add column if not exists current_period_start timestamptz,
  add column if not exists last_payment_at timestamptz;

create table if not exists public.admin_subscription_payments (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_email text,
  plan text not null check (plan in ('basic', 'plus')),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  paid_at timestamptz not null default now(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  method text not null default 'manual',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.admin_subscription_payments enable row level security;

create index if not exists idx_admin_subscription_payments_business
  on public.admin_subscription_payments(business_id, paid_at desc);

create index if not exists idx_admin_subscription_payments_paid_at
  on public.admin_subscription_payments(paid_at desc);

create index if not exists idx_subscriptions_current_period_end
  on public.subscriptions(current_period_end);

drop policy if exists "platform_admin_payments_read" on public.admin_subscription_payments;
drop policy if exists "platform_admin_payments_insert" on public.admin_subscription_payments;

create policy "platform_admin_payments_read"
  on public.admin_subscription_payments for select
  using (public.is_platform_admin());

create policy "platform_admin_payments_insert"
  on public.admin_subscription_payments for insert
  with check (public.is_platform_admin());

grant select, insert on table public.admin_subscription_payments to authenticated;
