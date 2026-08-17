-- ============================================================
-- TurboAgenda - Message delivery tracking
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

begin;

alter table public.notification_events
  add column if not exists provider_message_id text,
  add column if not exists provider_status text,
  add column if not exists provider_error_code text,
  add column if not exists provider_error_message text;

create index if not exists idx_notification_events_provider_message_id
  on public.notification_events(provider_message_id)
  where provider_message_id is not null;

grant select, insert, update on table public.notification_events to authenticated;
grant select, insert, update on table public.notification_events to service_role;

commit;
