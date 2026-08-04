-- TurboAgenda - Archive deleted services while preserving appointment history

alter table public.services
  add column if not exists deleted_at timestamptz;

create index if not exists idx_services_business_not_deleted
  on public.services (business_id, name)
  where deleted_at is null;
