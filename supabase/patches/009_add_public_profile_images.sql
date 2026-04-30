-- ============================================================
-- TurboAgenda - Public profile image fields
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

alter table public.businesses
  add column if not exists cover_image_url text,
  add column if not exists logo_image_url text,
  add column if not exists gallery_images text[] not null default '{}';

grant select on table public.businesses to anon;
grant select, insert, update, delete on table public.businesses to authenticated;
