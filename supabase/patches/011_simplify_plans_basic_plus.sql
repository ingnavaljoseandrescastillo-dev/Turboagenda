-- TurboAgenda - Simplify plans to Basic and Plus
-- Safe to run more than once in Supabase SQL Editor.

begin;

update public.subscriptions
set plan = 'plus',
    manual_override = true
where plan = 'pro';

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('trial', 'basic', 'plus'));

update public.business_settings bs
set whatsapp_enabled = false
where coalesce(bs.whatsapp_enabled, false) = true
  and not exists (
    select 1
    from public.subscriptions s
    where s.business_id = bs.business_id
      and s.plan = 'plus'
  );

create or replace function public.enqueue_appointment_notifications(
  p_appointment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_business public.businesses%rowtype;
  v_settings public.business_settings%rowtype;
  v_plan text;
begin
  select * into v_appt
  from public.appointments
  where id = p_appointment_id;

  if not found then
    return;
  end if;

  select * into v_business
  from public.businesses
  where id = v_appt.business_id;

  select * into v_settings
  from public.business_settings
  where business_id = v_appt.business_id;

  select plan into v_plan
  from public.subscriptions
  where business_id = v_appt.business_id
  limit 1;

  if v_plan is distinct from 'plus' then
    return;
  end if;

  if not coalesce(v_settings.whatsapp_enabled, false) then
    return;
  end if;

  if coalesce(v_settings.whatsapp_notify_client_on_booking, true)
     and nullif(v_appt.client_phone, '') is not null then
    insert into public.notification_events (
      business_id, appointment_id, channel, event_type, recipient_type,
      recipient_name, recipient_phone, payload
    )
    values (
      v_appt.business_id, v_appt.id, 'whatsapp', 'appointment_created_client', 'client',
      v_appt.client_name, v_appt.client_phone,
      jsonb_build_object(
        'business_name', v_business.name,
        'appointment_start', v_appt.start_time,
        'message_template', 'Reserva criada em {{business_name}} para {{appointment_start}}.'
      )
    );
  end if;

  if coalesce(v_settings.whatsapp_notify_business_on_booking, true)
     and nullif(v_business.phone, '') is not null then
    insert into public.notification_events (
      business_id, appointment_id, channel, event_type, recipient_type,
      recipient_name, recipient_phone, payload
    )
    values (
      v_appt.business_id, v_appt.id, 'whatsapp', 'appointment_created_business', 'business',
      v_business.name, v_business.phone,
      jsonb_build_object(
        'client_name', v_appt.client_name,
        'appointment_start', v_appt.start_time,
        'message_template', 'Nova reserva de {{client_name}} para {{appointment_start}}.'
      )
    );
  end if;

  if coalesce(v_settings.whatsapp_reminder_24h_enabled, true)
     and nullif(v_appt.client_phone, '') is not null
     and v_appt.start_time > now() + interval '24 hours' then
    insert into public.notification_events (
      business_id, appointment_id, channel, event_type, recipient_type,
      recipient_name, recipient_phone, scheduled_for, payload
    )
    values (
      v_appt.business_id, v_appt.id, 'whatsapp', 'appointment_reminder_24h', 'client',
      v_appt.client_name, v_appt.client_phone, v_appt.start_time - interval '24 hours',
      jsonb_build_object(
        'business_name', v_business.name,
        'business_phone', v_business.phone,
        'appointment_start', v_appt.start_time,
        'message_template', 'Recordatorio: tiene una reserva en {{business_name}} manana. Si no puede asistir, comuniquese a {{business_phone}}.'
      )
    );
  end if;
end;
$$;

grant execute on function public.enqueue_appointment_notifications(uuid) to anon, authenticated;

commit;
