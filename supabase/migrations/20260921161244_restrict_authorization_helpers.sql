-- Owner/admin policies created for PUBLIC must only run for authenticated users
-- before anonymous EXECUTE is revoked. Public read policies remain unchanged.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where 'public' = any(roles)
      and (coalesce(qual, '') || coalesce(with_check, '')) ~
        'is_business_owner|is_platform_admin'
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

-- These authorization helpers remain callable by signed-in users and server jobs.
revoke execute on function public.is_business_owner(uuid) from public, anon;
grant execute on function public.is_business_owner(uuid) to authenticated, service_role;

revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;
