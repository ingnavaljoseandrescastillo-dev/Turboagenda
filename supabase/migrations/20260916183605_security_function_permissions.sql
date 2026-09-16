-- Version aligned with the production migration history.
begin;

-- These helpers are not public RPC endpoints; trigger invocation is unaffected.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('enqueue_appointment_notifications', 'get_available_slots',
       'handle_new_business', 'rls_auto_enable')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;

  for f in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('set_updated_at', 'create_default_business_settings', 'update_client_metrics',
       'time_ranges_from_json', 'create_public_appointment')
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.signature);
  end loop;
end $$;

-- Keep extension internals outside the exposed API schema.
alter extension btree_gist set schema extensions;
commit;
