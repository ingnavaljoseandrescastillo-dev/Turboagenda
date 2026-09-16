-- Version aligned with the production migration history.
begin;
create extension if not exists btree_gist;
alter table public.appointments add constraint appointments_no_overlap
exclude using gist (employee_id with =, tstzrange(start_time,end_time,'[)') with &&)
where (status <> 'cancelled');

create or replace function public.protect_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('postgres','service_role','supabase_admin') or public.is_platform_admin() then return new; end if;
  if tg_table_name = 'businesses' then
    if tg_op = 'INSERT' then
      if coalesce(new.is_paused,false) or new.paused_at is not null or new.pause_reason is not null then
        raise exception 'Administrative fields are protected' using errcode='42501';
      end if;
    elsif new.is_paused is distinct from old.is_paused or new.paused_at is distinct from old.paused_at or new.pause_reason is distinct from old.pause_reason or new.owner_id is distinct from old.owner_id then
      raise exception 'Administrative fields are protected' using errcode='42501';
    end if;
  elsif tg_table_name = 'business_settings' then
    if tg_op = 'INSERT' then
      if new.sms_trial_override_until is not null then raise exception 'Administrative fields are protected' using errcode='42501'; end if;
    elsif new.sms_trial_override_until is distinct from old.sms_trial_override_until then
      raise exception 'Administrative fields are protected' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
create trigger protect_business_admin_fields before insert or update on public.businesses for each row execute function public.protect_admin_fields();
create trigger protect_settings_admin_fields before insert or update on public.business_settings for each row execute function public.protect_admin_fields();
revoke all on function public.protect_admin_fields() from public,anon,authenticated;

commit;
