-- ============================================================
-- TurboAgenda - Fix API grants for authenticated Supabase users
-- Safe to run multiple times in Supabase SQL Editor.
-- RLS still controls which rows each user can access.
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select on table public.businesses to anon;
grant select on table public.business_settings to anon;
grant select on table public.employees to anon;
grant select on table public.services to anon;
grant select on table public.reviews to anon;

grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.business_owners to authenticated;
grant select, insert, update, delete on table public.business_settings to authenticated;
grant select, insert, update, delete on table public.employees to authenticated;
grant select, insert, update, delete on table public.services to authenticated;
grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;
grant select, insert, update, delete on table public.reviews to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;

grant execute on function public.is_business_owner(uuid) to anon, authenticated;
grant execute on function public.get_available_slots(uuid, uuid, uuid, date) to anon, authenticated;
grant execute on function public.create_public_appointment(uuid, uuid, uuid, text, text, text, timestamptz, text) to anon, authenticated;
