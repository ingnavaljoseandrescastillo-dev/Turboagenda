-- TurboAgenda - Public business image uploads
-- Creates a public Supabase Storage bucket for cover, logo and gallery images.
-- Safe to run more than once in Supabase SQL Editor.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images',
  'business-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'business_images_public_read'
  ) then
    create policy "business_images_public_read"
      on storage.objects for select
      using (bucket_id = 'business-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'business_images_owner_insert'
  ) then
    create policy "business_images_owner_insert"
      on storage.objects for insert
      with check (
        bucket_id = 'business-images'
        and public.is_business_owner(((storage.foldername(name))[1])::uuid)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'business_images_owner_update'
  ) then
    create policy "business_images_owner_update"
      on storage.objects for update
      using (
        bucket_id = 'business-images'
        and public.is_business_owner(((storage.foldername(name))[1])::uuid)
      )
      with check (
        bucket_id = 'business-images'
        and public.is_business_owner(((storage.foldername(name))[1])::uuid)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'business_images_owner_delete'
  ) then
    create policy "business_images_owner_delete"
      on storage.objects for delete
      using (
        bucket_id = 'business-images'
        and public.is_business_owner(((storage.foldername(name))[1])::uuid)
      );
  end if;
end;
$$;

commit;
