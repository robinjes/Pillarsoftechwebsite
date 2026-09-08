-- Task 04 media finalization storage. Incoming uploads remain private and are
-- never readable or writable by browser roles. Final images/videos use a
-- public bucket for durable approved URLs; PDFs remain in a private bucket and
-- are delivered only by the verified server route.

alter table if exists public.media_assets
  drop constraint if exists media_assets_status_check;

alter table if exists public.media_assets
  add constraint media_assets_status_check
  check (status in ('incoming', 'processing', 'finalized', 'rejected'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 104857600, array['image/webp', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('private-documents', 'private-documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
  'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime'
]
where id = 'incoming-media';

-- Public buckets do not require storage.objects grants for reads. Leave
-- existing project policies alone and add only restrictive predicates for
-- these three named buckets; the service-role finalizer is the only writer.

drop policy if exists media_storage_deny_client_inserts on storage.objects;
create policy media_storage_deny_client_inserts
on storage.objects as restrictive
for insert to anon, authenticated
with check (bucket_id not in ('incoming-media', 'public-media', 'private-documents'));

drop policy if exists media_storage_deny_client_updates on storage.objects;
create policy media_storage_deny_client_updates
on storage.objects as restrictive
for update to anon, authenticated
using (bucket_id not in ('incoming-media', 'public-media', 'private-documents'))
with check (bucket_id not in ('incoming-media', 'public-media', 'private-documents'));

drop policy if exists media_storage_deny_client_deletes on storage.objects;
create policy media_storage_deny_client_deletes
on storage.objects as restrictive
for delete to anon, authenticated
using (bucket_id not in ('incoming-media', 'public-media', 'private-documents'));

drop policy if exists media_storage_deny_private_reads on storage.objects;
create policy media_storage_deny_private_reads
on storage.objects as restrictive
for select to anon, authenticated
using (bucket_id not in ('incoming-media', 'private-documents'));
