-- TurboAgenda - Temporary SMS access for selected trials
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.business_settings
  add column if not exists sms_trial_override_until timestamptz;

commit;
