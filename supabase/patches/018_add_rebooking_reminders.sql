-- TurboAgenda - Automated rebooking reminders
-- Adds configurable post-appointment reminders that invite clients to book again.
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.business_settings
  add column if not exists email_rebooking_reminder_enabled boolean not null default false,
  add column if not exists email_rebooking_reminder_delay_days integer not null default 21,
  add column if not exists email_rebooking_reminder_message text not null default 'Hola {{client_name}}, esperamos que hayas disfrutado tu visita en {{business_name}}. Cuando quieras volver, puedes reservar aqui: {{public_url}}',
  add column if not exists whatsapp_rebooking_reminder_enabled boolean not null default false,
  add column if not exists whatsapp_rebooking_reminder_delay_days integer not null default 21,
  add column if not exists whatsapp_rebooking_reminder_message text not null default 'Hola {{client_name}}, esperamos que hayas disfrutado tu visita en {{business_name}}. Puedes volver a reservar aqui: {{public_url}}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_settings_email_rebooking_delay_check'
  ) then
    alter table public.business_settings
      add constraint business_settings_email_rebooking_delay_check
      check (email_rebooking_reminder_delay_days between 1 and 365);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_settings_whatsapp_rebooking_delay_check'
  ) then
    alter table public.business_settings
      add constraint business_settings_whatsapp_rebooking_delay_check
      check (whatsapp_rebooking_reminder_delay_days between 1 and 365);
  end if;
end $$;

alter table public.notification_events
  drop constraint if exists notification_events_event_type_check;

alter table public.notification_events
  add constraint notification_events_event_type_check
  check (
    event_type in (
      'appointment_created_client',
      'appointment_created_business',
      'appointment_reminder_24h',
      'birthday_greeting',
      'manual_reminder',
      'rebooking_reminder'
    )
  );

create index if not exists idx_notification_events_rebooking_dedupe
  on public.notification_events(business_id, client_id, appointment_id, channel, event_type);

grant select, update on table public.business_settings to authenticated;
grant select, insert, update on table public.notification_events to authenticated;

commit;
