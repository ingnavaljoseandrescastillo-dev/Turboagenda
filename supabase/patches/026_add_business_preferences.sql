-- Business display preferences for dashboard and public booking pages.
-- Safe to run more than once in the Supabase SQL Editor.

alter table public.businesses
  add column if not exists default_language text not null default 'pt',
  add column if not exists currency text not null default 'EUR';

update public.businesses
set default_language = 'pt'
where default_language is null or default_language not in ('pt', 'en', 'es');

update public.businesses
set currency = 'EUR'
where currency is null or currency not in ('EUR', 'USD', 'VES');

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
    add constraint businesses_currency_check
    check (currency in ('EUR', 'USD', 'VES'));
exception
  when duplicate_object then null;
end $$;
