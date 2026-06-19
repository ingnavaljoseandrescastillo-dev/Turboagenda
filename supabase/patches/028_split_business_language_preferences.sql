-- Split dashboard/public language preferences and normalize business currencies.
-- Safe to run more than once in the Supabase SQL Editor.

alter table public.businesses
  add column if not exists default_language text default 'pt',
  add column if not exists dashboard_language text default 'pt',
  add column if not exists public_language text default 'pt',
  add column if not exists currency text default 'EUR';

update public.businesses
set default_language = 'pt'
where default_language is null or default_language not in ('pt', 'en', 'es');

update public.businesses
set dashboard_language = coalesce(nullif(dashboard_language, ''), default_language, 'pt')
where dashboard_language is null or dashboard_language not in ('pt', 'en', 'es');

update public.businesses
set public_language = coalesce(nullif(public_language, ''), default_language, dashboard_language, 'pt')
where public_language is null or public_language not in ('pt', 'en', 'es');

update public.businesses
set currency = 'EUR'
where currency is null or currency not in ('EUR', 'USD', 'VES');

alter table public.businesses
  alter column default_language set default 'pt',
  alter column dashboard_language set default 'pt',
  alter column public_language set default 'pt',
  alter column currency set default 'EUR',
  alter column dashboard_language set not null,
  alter column public_language set not null,
  alter column currency set not null;

do $$
begin
  alter table public.businesses
    add constraint businesses_default_language_check
    check (default_language in ('pt', 'en', 'es'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.businesses
    add constraint businesses_dashboard_language_check
    check (dashboard_language in ('pt', 'en', 'es'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.businesses
    add constraint businesses_public_language_check
    check (public_language in ('pt', 'en', 'es'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.businesses
    add constraint businesses_currency_check
    check (currency in ('EUR', 'USD', 'VES'));
exception
  when duplicate_object then null;
end $$;
