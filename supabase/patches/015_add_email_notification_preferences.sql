-- TurboAgenda - Email notification preferences
-- Adds per-business switches for email notifications and updates the email payload RPC.
-- Safe to run multiple times in Supabase SQL Editor.

begin;

alter table public.businesses
  add column if not exists notification_email text;

alter table public.business_settings
  add column if not exists email_notify_client_on_booking boolean not null default true,
  add column if not exists email_notify_business_on_booking boolean not null default true,
  add column if not exists email_reminder_24h_enabled boolean not null default true,
  add column if not exists email_notify_client_on_cancellation boolean not null default true;

create or replace function public.get_appointment_email_payload(
  p_appointment_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'client_name', a.client_name,
    'client_email', a.client_email,
    'client_phone', a.client_phone,
    'start_time', a.start_time,
    'end_time', a.end_time,
    'businesses', jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'phone', b.phone,
      'notification_email', b.notification_email
    ),
    'services', jsonb_build_object(
      'name', s.name,
      'duration_minutes', s.duration_minutes,
      'price', s.price
    ),
    'employees', jsonb_build_object(
      'name', e.name
    ),
    'business_settings', jsonb_build_object(
      'email_notify_client_on_booking', bs.email_notify_client_on_booking,
      'email_notify_business_on_booking', bs.email_notify_business_on_booking,
      'email_reminder_24h_enabled', bs.email_reminder_24h_enabled,
      'email_notify_client_on_cancellation', bs.email_notify_client_on_cancellation
    )
  )
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  left join public.business_settings bs on bs.business_id = a.business_id
  left join public.services s on s.id = a.service_id
  left join public.employees e on e.id = a.employee_id
  where a.id = p_appointment_id;
$$;

grant execute on function public.get_appointment_email_payload(uuid) to anon, authenticated;

commit;
