-- These helpers are used by authenticated RLS policies. Anonymous callers do
-- not need direct RPC access, and service_role keeps access for server jobs.
revoke execute on function public.is_business_owner(uuid) from public, anon;
grant execute on function public.is_business_owner(uuid) to authenticated, service_role;

revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;
