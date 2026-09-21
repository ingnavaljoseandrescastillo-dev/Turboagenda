create table public.service_discount_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  discount_percent integer not null check (discount_percent between 1 and 99),
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  service_ids uuid[] not null check (cardinality(service_ids) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_dates_valid check (ends_on >= starts_on)
);

create index service_discount_campaigns_business_dates
  on public.service_discount_campaigns (business_id, starts_on, ends_on)
  where is_active;

alter table public.service_discount_campaigns enable row level security;
create policy campaigns_owner_manage on public.service_discount_campaigns
  for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
grant select, insert, update, delete on public.service_discount_campaigns to authenticated;
grant select, insert, update, delete on public.service_discount_campaigns to service_role;

create function public.validate_service_discount_campaign()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.business_id::text, 0));
  if exists (
    select 1 from pg_catalog.unnest(new.service_ids) selected(service_id)
    left join public.services s on s.id = selected.service_id
      and s.business_id = new.business_id and s.deleted_at is null
    where s.id is null
  ) or cardinality(new.service_ids) <> (
    select count(distinct service_id) from pg_catalog.unnest(new.service_ids) selected(service_id)
  ) then
    raise exception 'A campanha inclui serviços inválidos ou repetidos';
  end if;
  if new.is_active and exists (
    select 1 from public.service_discount_campaigns c
    where c.business_id = new.business_id and c.id <> new.id and c.is_active
      and pg_catalog.daterange(c.starts_on, c.ends_on, '[]') &&
          pg_catalog.daterange(new.starts_on, new.ends_on, '[]')
      and c.service_ids && new.service_ids
  ) then
    raise exception 'Já existe uma campanha ativa para um destes serviços e datas';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.validate_service_discount_campaign() from public, anon, authenticated;
create trigger validate_service_discount_campaign_before_write
before insert or update on public.service_discount_campaigns
for each row execute function public.validate_service_discount_campaign();

create function public.snapshot_campaign_service_price()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  appointment_business uuid;
  appointment_day date;
  base_price numeric(10,2);
  discount integer;
begin
  select a.business_id,
         (a.start_time at time zone coalesce(bs.time_zone, 'Europe/Lisbon'))::date,
         s.price
    into appointment_business, appointment_day, base_price
  from public.appointments a
  join public.services s on s.id = new.service_id and s.business_id = a.business_id
  left join public.business_settings bs on bs.business_id = a.business_id
  where a.id = new.appointment_id;

  if appointment_business is null then
    raise exception 'Serviço da reserva inválido';
  end if;
  select c.discount_percent into discount
  from public.service_discount_campaigns c
  where c.business_id = appointment_business and c.is_active
    and new.service_id = any(c.service_ids)
    and appointment_day between c.starts_on and c.ends_on
  limit 1;
  new.price := round(base_price * (100 - coalesce(discount, 0)) / 100.0, 2);
  return new;
end;
$$;
revoke all on function public.snapshot_campaign_service_price() from public, anon, authenticated;
create trigger snapshot_campaign_service_price_before_insert
before insert on public.appointment_services
for each row execute function public.snapshot_campaign_service_price();

create function public.refresh_campaign_deposit_amount()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.appointments a
  set deposit_amount = round(
    coalesce((select sum(aps.price) from public.appointment_services aps
              where aps.appointment_id = new.appointment_id), 0)
      * a.deposit_percent / 100.0, 2)
  where a.id = new.appointment_id and a.deposit_required and a.deposit_percent is not null;
  return null;
end;
$$;
revoke all on function public.refresh_campaign_deposit_amount() from public, anon, authenticated;
create trigger refresh_campaign_deposit_amount_after_insert
after insert on public.appointment_services
for each row execute function public.refresh_campaign_deposit_amount();
