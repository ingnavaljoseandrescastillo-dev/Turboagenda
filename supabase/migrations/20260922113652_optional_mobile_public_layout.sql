-- Existing businesses keep their current public page until an owner opts in.
alter table public.businesses
  add column public_mobile_layout_enabled boolean not null default false;
