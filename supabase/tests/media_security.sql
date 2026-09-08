begin;
select plan(14);

select ok(
  exists(select 1 from storage.buckets where id = 'incoming-media' and "public" is false),
  'incoming media bucket is private'
);
select ok(
  exists(select 1 from storage.buckets where id = 'public-media' and "public" is true),
  'final public media bucket is explicitly public'
);
select ok(
  exists(select 1 from storage.buckets where id = 'private-documents' and "public" is false),
  'final document bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'incoming-media'),
  104857600::bigint,
  'incoming bucket caps uploads at 100 MiB'
);
select is(
  (select file_size_limit from storage.buckets where id = 'public-media'),
  104857600::bigint,
  'public media bucket caps objects at 100 MiB'
);
select is(
  (select file_size_limit from storage.buckets where id = 'private-documents'),
  20971520::bigint,
  'private document bucket caps objects at 20 MiB'
);
select is(
  (select array_length(allowed_mime_types, 1) from storage.buckets where id = 'incoming-media'),
  8,
  'incoming bucket allows only the reviewed media MIME set'
);
select ok(
  (select 'application/pdf' = any(allowed_mime_types) from storage.buckets where id = 'private-documents'),
  'private document bucket allows PDF only'
);
select ok(
  not exists(
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and permissive = 'PERMISSIVE'
      and (coalesce(qual, '') ilike '%public-media%' or coalesce(qual, '') ilike '%private-documents%'
        or coalesce(with_check, '') ilike '%public-media%' or coalesce(with_check, '') ilike '%private-documents%')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'final buckets have no browser write policies'
);
select ok(
  not exists(
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and permissive = 'PERMISSIVE'
      and qual ilike '%private-documents%'
      and cmd = 'SELECT'
  ),
  'private document bucket has no browser read policy'
);
select ok(
  not exists(
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and permissive = 'PERMISSIVE'
      and (coalesce(qual, '') ilike '%private-documents%' or coalesce(with_check, '') ilike '%private-documents%')
  ),
  'private document bucket has no permissive browser policy'
);
select is(
  (select count(*) from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in ('media_storage_deny_client_inserts', 'media_storage_deny_client_updates', 'media_storage_deny_client_deletes')
      and permissive = 'RESTRICTIVE'
      and coalesce(qual, '') || coalesce(with_check, '') ilike '%incoming-media%'),
  3::bigint,
  'protected buckets have restrictive client-write deny policies'
);
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_storage_deny_private_reads'
      and permissive = 'RESTRICTIVE'
      and qual ilike '%incoming-media%'
      and qual ilike '%private-documents%'
  ),
  'incoming and private-document buckets have a restrictive read deny policy'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conrelid = 'public.media_assets'::regclass
      and conname = 'media_assets_status_check'
      and pg_get_constraintdef(oid) ilike '%processing%'
  ),
  'media finalization has an atomic processing state'
);

select * from finish();
rollback;
