-- TurboAgenda - Manual client reminders
-- Extends notification_events so business owners can send and audit manual reminders.
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.notification_events
  add column if not exists recipient_email text;

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
      'manual_reminder'
    )
  );

create index if not exists idx_notification_events_client_created
  on public.notification_events(client_id, created_at desc);

create index if not exists idx_notification_events_manual_reminders
  on public.notification_events(business_id, event_type, created_at desc)
  where event_type = 'manual_reminder';

drop policy if exists "notification_events_owner_read" on public.notification_events;
drop policy if exists "notification_events_owner_insert" on public.notification_events;
drop policy if exists "notification_events_owner_update" on public.notification_events;
drop policy if exists "notification_events_platform_admin_read" on public.notification_events;

create policy "notification_events_owner_read"
  on public.notification_events for select
  to authenticated
  using (public.is_business_owner(business_id));

create policy "notification_events_owner_insert"
  on public.notification_events for insert
  to authenticated
  with check (public.is_business_owner(business_id));

create policy "notification_events_owner_update"
  on public.notification_events for update
  to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "notification_events_platform_admin_read"
  on public.notification_events for select
  to authenticated
  using (public.is_platform_admin());

grant select, insert, update on table public.notification_events to authenticated;

commit;
