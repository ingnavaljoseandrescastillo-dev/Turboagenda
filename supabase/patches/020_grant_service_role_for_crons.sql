-- TurboAgenda - Allow server-side cron jobs to read and write required data.
-- Safe to run multiple times. Does not modify user or business records.

begin;

grant usage on schema public to service_role;

grant select on table public.appointments to service_role;
grant select on table public.businesses to service_role;
grant select on table public.business_settings to service_role;
grant select on table public.services to service_role;
grant select on table public.employees to service_role;
grant select on table public.clients to service_role;
grant select on table public.subscriptions to service_role;

grant select, insert, update on table public.notification_events to service_role;

commit;
