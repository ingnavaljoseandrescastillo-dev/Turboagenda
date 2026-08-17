-- ============================================================
-- TurboAgenda - PWA push notifications
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  audience text not null check (audience in ('business', 'admin')),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_notification_events (
  id uuid primary key default uuid_generate_v4(),
  event_key text not null unique,
  audience text not null check (audience in ('business', 'admin')),
  business_id uuid references public.businesses(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_events enable row level security;

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id);

create index if not exists idx_push_subscriptions_business
  on public.push_subscriptions(business_id);

create index if not exists idx_push_subscriptions_audience
  on public.push_subscriptions(audience);

create index if not exists idx_push_notification_events_business
  on public.push_notification_events(business_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_push_subscriptions_updated_at on public.push_subscriptions;
create trigger update_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.update_updated_at_column();

drop policy if exists "push_subscriptions_owner_read" on public.push_subscriptions;
drop policy if exists "push_subscriptions_owner_insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions_owner_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_owner_delete" on public.push_subscriptions;
drop policy if exists "push_events_admin_read" on public.push_notification_events;
drop policy if exists "push_events_business_read" on public.push_notification_events;

create policy "push_subscriptions_owner_read"
  on public.push_subscriptions for select
  using (
    user_id = auth.uid()
    or (business_id is not null and public.is_business_owner(business_id))
    or public.is_platform_admin()
  );

create policy "push_subscriptions_owner_insert"
  on public.push_subscriptions for insert
  with check (
    user_id = auth.uid()
    and (
      (audience = 'business' and business_id is not null and public.is_business_owner(business_id))
      or (audience = 'admin' and business_id is null and public.is_platform_admin())
    )
  );

create policy "push_subscriptions_owner_update"
  on public.push_subscriptions for update
  using (
    user_id = auth.uid()
    or (business_id is not null and public.is_business_owner(business_id))
    or public.is_platform_admin()
  )
  with check (
    user_id = auth.uid()
    and (
      (audience = 'business' and business_id is not null and public.is_business_owner(business_id))
      or (audience = 'admin' and business_id is null and public.is_platform_admin())
    )
  );

create policy "push_subscriptions_owner_delete"
  on public.push_subscriptions for delete
  using (
    user_id = auth.uid()
    or (business_id is not null and public.is_business_owner(business_id))
    or public.is_platform_admin()
  );

create policy "push_events_admin_read"
  on public.push_notification_events for select
  using (public.is_platform_admin());

create policy "push_events_business_read"
  on public.push_notification_events for select
  using (business_id is not null and public.is_business_owner(business_id));

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select on table public.push_notification_events to authenticated;
