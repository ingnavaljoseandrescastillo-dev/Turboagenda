-- Apply only after the server-side deployment is ready.
-- Version aligned with the production migration history.
begin;
drop policy if exists businesses_public_read on public.businesses;
drop policy if exists business_settings_public_read on public.business_settings;

do $$
declare f record; definition text;
begin
  for f in select p.oid,p.proname,p.pronargs,p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_appointment_email_payload','create_public_appointment','has_completed_public_client_appointment')
  loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
    if f.proname='create_public_appointment' and f.pronargs=11 then
      definition := pg_get_functiondef(f.oid);
      if position('if v_local_start::date < current_date then' in definition)=0 then raise exception 'Unexpected booking definition'; end if;
      definition := replace(definition,'if v_local_start::date < current_date then','if p_start_time <= now() then');
      definition := replace(definition,'if nullif(trim(p_client_name)',E'if not exists (select 1 from public.businesses where id=p_business_id and not coalesce(is_paused,false)) then raise exception ''Negocio indisponivel''; end if;\n  if nullif(trim(p_client_name)');
      execute definition;
    end if;
  end loop;
end $$;

create table public.api_rate_limits (
  key_hash text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public,anon,authenticated;
grant all on public.api_rate_limits to service_role;
create function public.consume_api_rate_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
  insert into public.api_rate_limits(key_hash,window_start,hits) values(p_key,now(),1)
  on conflict(key_hash) do update set
    hits=case when api_rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else api_rate_limits.hits+1 end,
    window_start=case when api_rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else api_rate_limits.window_start end
  returning hits into n;
  delete from public.api_rate_limits where window_start < now()-interval '2 days';
  return n<=p_limit;
end $$;
revoke all on function public.consume_api_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text,integer,integer) to service_role;
create table public.booking_requests (
 id uuid primary key, fingerprint text not null, appointment_id uuid references public.appointments(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from public,anon,authenticated;
grant all on public.booking_requests to service_role;
-- Only the server can attest verified contacts.
create function public.create_verified_public_appointment(
p_business_id uuid,p_service_id uuid,p_employee_id uuid,p_client_name text,
p_client_email text,p_client_phone text,p_client_birthdate date,p_start_time timestamptz,
p_notes text,p_service_ids uuid[],p_payment_proof_path text,p_verified_email text,p_verified_phone text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare existing public.booking_requests%rowtype; request_fingerprint text; result_id uuid;
begin
  request_fingerprint := md5(jsonb_build_array(p_business_id,p_service_id,p_employee_id,p_client_name,p_client_email,p_client_phone,p_client_birthdate,p_start_time,p_notes,p_service_ids)::text);
  insert into public.booking_requests(id,fingerprint) values(p_request_id,request_fingerprint) on conflict(id) do nothing;
  select * into existing from public.booking_requests where id=p_request_id for update;
  if existing.fingerprint <> request_fingerprint then raise exception 'Pedido reutilizado com dados diferentes'; end if;
  if existing.appointment_id is not null then return jsonb_build_object('id',existing.appointment_id,'created',false); end if;
  perform set_config('app.verified_email',coalesce(p_verified_email,''),true);
  perform set_config('app.verified_phone',coalesce(p_verified_phone,''),true);
  result_id := public.create_public_appointment(p_business_id,p_service_id,p_employee_id,p_client_name,
    p_client_email,p_client_phone,p_client_birthdate,p_start_time,p_notes,p_service_ids,p_payment_proof_path);
  update public.booking_requests set appointment_id=result_id where id=p_request_id;
  return jsonb_build_object('id',result_id,'created',true);
end $$;
revoke all on function public.create_verified_public_appointment(uuid,uuid,uuid,text,text,text,date,timestamptz,text,uuid[],text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.create_verified_public_appointment(uuid,uuid,uuid,text,text,text,date,timestamptz,text,uuid[],text,text,text,uuid) to service_role;

do $$
declare definition text; old_fragment text;
begin
  select pg_get_functiondef('public.create_public_appointment(uuid,uuid,uuid,text,text,text,date,timestamptz,text,uuid[],text)'::regprocedure) into definition;
  old_fragment := E'    v_client_email,\n    p_client_phone\n  );';
  if position(old_fragment in definition)=0 then raise exception 'Unexpected contact check'; end if;
  definition := replace(definition,old_fragment,E'    nullif(current_setting(''app.verified_email'',true),''''),\n    nullif(current_setting(''app.verified_phone'',true),'''')\n  );');
  -- Unverified bookings must not overwrite an existing customer profile.
  definition := replace(definition,E'set name = excluded.name,\n          phone = coalesce(excluded.phone, public.clients.phone),\n          birthdate = coalesce(excluded.birthdate, public.clients.birthdate),\n          last_appointment_at', 'set last_appointment_at');
  execute definition;
end $$;
commit;
