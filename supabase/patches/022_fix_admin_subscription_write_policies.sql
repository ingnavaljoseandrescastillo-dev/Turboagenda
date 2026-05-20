-- ============================================================
-- TurboAgenda - Allow platform admins to activate subscriptions
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

alter table public.subscriptions enable row level security;

drop policy if exists "platform_admin_subscriptions_read" on public.subscriptions;
drop policy if exists "platform_admin_subscriptions_insert" on public.subscriptions;
drop policy if exists "platform_admin_subscriptions_update" on public.subscriptions;

create policy "platform_admin_subscriptions_read"
  on public.subscriptions for select
  using (public.is_platform_admin());

create policy "platform_admin_subscriptions_insert"
  on public.subscriptions for insert
  with check (public.is_platform_admin());

create policy "platform_admin_subscriptions_update"
  on public.subscriptions for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select, insert, update on table public.subscriptions to authenticated;
