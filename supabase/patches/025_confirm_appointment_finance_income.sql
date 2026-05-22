-- ============================================================
-- TurboAgenda - Confirm appointment income in business finances
-- Safe to run multiple times in Supabase SQL Editor.
-- Keeps the original service value and discount for confirmed charges.
-- ============================================================

alter table public.business_finance_entries
  add column if not exists gross_amount_cents int,
  add column if not exists discount_cents int not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_finance_entries_gross_amount_check'
      and conrelid = 'public.business_finance_entries'::regclass
  ) then
    alter table public.business_finance_entries
      add constraint business_finance_entries_gross_amount_check
      check (gross_amount_cents is null or gross_amount_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_finance_entries_discount_check'
      and conrelid = 'public.business_finance_entries'::regclass
  ) then
    alter table public.business_finance_entries
      add constraint business_finance_entries_discount_check
      check (
        discount_cents >= 0
        and (gross_amount_cents is null or discount_cents <= gross_amount_cents)
      );
  end if;
end $$;

create unique index if not exists idx_business_finance_entries_appointment_income
  on public.business_finance_entries(appointment_id)
  where appointment_id is not null and type = 'income';
