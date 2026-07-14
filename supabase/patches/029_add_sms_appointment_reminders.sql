-- TurboAgenda - SMS appointment reminders
-- Adds Twilio-backed SMS reminder preferences and allows SMS notification events.
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.business_settings
  add column if not exists sms_reminder_24h_enabled boolean not null default false;

alter table public.notification_events
  drop constraint if exists notification_events_channel_check;

alter table public.notification_events
  add constraint notification_events_channel_check
  check (channel in ('whatsapp', 'email', 'sms', 'system'));

create index if not exists idx_notification_events_sms_reminder_dedupe
  on public.notification_events(appointment_id, channel, event_type, status);

grant select, update on table public.business_settings to authenticated;
grant select, insert, update on table public.notification_events to authenticated;

commit;
