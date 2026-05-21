-- ============================================================
-- TurboAgenda - Admin payment adjustments
-- Safe to run multiple times in Supabase SQL Editor.
-- Adds soft-void support so mistaken manual payments can be
-- corrected without losing accounting history.
-- ============================================================

alter table public.admin_subscription_payments
  add column if not exists status text not null default 'paid',
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists voided_reason text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_subscription_payments_status_check'
      and conrelid = 'public.admin_subscription_payments'::regclass
  ) then
    alter table public.admin_subscription_payments
      add constraint admin_subscription_payments_status_check
      check (status in ('paid', 'voided'));
  end if;
end $$;

update public.admin_subscription_payments
set status = 'paid'
where status is null;

create index if not exists idx_admin_subscription_payments_status
  on public.admin_subscription_payments(business_id, status, period_end desc);

drop policy if exists "platform_admin_payments_update" on public.admin_subscription_payments;

create policy "platform_admin_payments_update"
  on public.admin_subscription_payments for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select, insert, update on table public.admin_subscription_payments to authenticated;
