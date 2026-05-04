-- TurboAgenda - Public page theme fields
-- Adds controlled appearance settings per business.
-- Safe to run more than once in Supabase SQL Editor.

begin;

alter table public.businesses
  add column if not exists theme_primary_color text not null default '#10b981',
  add column if not exists theme_background_color text not null default '#09090b',
  add column if not exists theme_text_color text not null default '#f4f4f5',
  add column if not exists theme_background_image_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_theme_primary_color_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_theme_primary_color_check
      check (theme_primary_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_theme_background_color_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_theme_background_color_check
      check (theme_background_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_theme_text_color_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_theme_text_color_check
      check (theme_text_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end;
$$;

commit;
